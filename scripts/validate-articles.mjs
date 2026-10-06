import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

export function validateArticleData(index, articleFiles, readArticle) {
  const errors = [];
  const fail = (where, message) => errors.push(where + '：' + message);
  const nonEmptyText = value => typeof value === 'string' && value.trim().length > 0;
  const validHttpsUrl = value => {
    if (typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && Boolean(url.hostname);
    } catch {
      return false;
    }
  };

  if (!index || index.schemaVersion !== 1 || !Array.isArray(index.articles)) {
    return ['data/articles/index.json：索引格式錯誤，預期 schemaVersion 為 1，且 articles 為陣列。'];
  }

  const availableFiles = new Set(
    articleFiles.filter(name => name.endsWith('.json') && name !== 'index.json')
  );
  const referencedFiles = new Set();
  const seenIds = new Set();
  const seenOrders = new Set();

  for (const [position, entry] of index.articles.entries()) {
    const where = '索引第 ' + (position + 1) + ' 項';
    if (!entry || typeof entry !== 'object') {
      fail(where, '文章資料不是物件。');
      continue;
    }

    if (typeof entry.id !== 'string' || !entry.id.trim()) {
      fail(where, '缺少有效的 id。');
      continue;
    }
    const id = entry.id;
    if (seenIds.has(id)) fail(where, 'id「' + id + '」重複。');
    seenIds.add(id);

    if (!Number.isInteger(entry.order) || entry.order < 1) {
      fail(id, 'order 必須是正整數。');
    } else if (seenOrders.has(entry.order)) {
      fail(id, 'order「' + entry.order + '」重複。');
    } else {
      seenOrders.add(entry.order);
    }
    for (const field of ['title', 'author', 'intro']) {
      if (!nonEmptyText(entry[field])) fail(id, '索引的 ' + field + ' 不可留空。');
    }
    if (!['classical', 'vernacular'].includes(entry.type)) {
      fail(id, 'type 必須是 classical 或 vernacular。');
    }
    if (!Number.isInteger(entry.difficultyLevel) || entry.difficultyLevel < 1 || entry.difficultyLevel > 5) {
      fail(id, 'difficultyLevel 必須是 1 至 5 的整數。');
    }
    if (typeof entry.ready !== 'boolean') fail(id, 'ready 必須是布林值。');
    if (entry.category !== undefined && entry.category !== null && typeof entry.category !== 'string') {
      fail(id, 'category 必須是字串或留空。');
    }
    if (entry.sourceUrl !== undefined && entry.sourceUrl !== null && entry.sourceUrl !== '' && !validHttpsUrl(entry.sourceUrl)) {
      fail(id, 'sourceUrl 必須是有效的 HTTPS 網址或留空。');
    }

    const expectedData = './data/articles/' + id + '.json';
    if (entry.data !== expectedData) {
      fail(id, 'data 應為「' + expectedData + '」，目前是「' + (entry.data ?? '') + '」。');
    }

    const filename = typeof entry.data === 'string' ? entry.data.split('/').pop() : '';
    if (!filename || !availableFiles.has(filename)) {
      fail(id, '找不到資料檔「' + (entry.data ?? '') + '」。');
      continue;
    }
    if (referencedFiles.has(filename)) fail(id, '資料檔「' + filename + '」被多筆索引重用。');
    referencedFiles.add(filename);

    let article;
    try {
      article = readArticle(filename);
    } catch (error) {
      fail(id, '資料檔無法讀取或不是有效 JSON（' + error.message + '）。');
      continue;
    }

    if (!article || article.id !== id) {
      fail(id, '單篇檔案的 id 應為「' + id + '」，目前是「' + (article?.id ?? '') + '」。');
    }
    if (article?.schemaVersion !== 1) fail(id, '單篇檔案 schemaVersion 必須是 1。');
    for (const field of ['title', 'author', 'type', 'category', 'intro', 'sourceUrl', 'order']) {
      if ((article?.[field] ?? '') !== (entry[field] ?? '')) {
        fail(id, '單篇檔案的 ' + field + ' 與索引不一致。');
      }
    }
    if (!Array.isArray(article?.paragraphs)) {
      fail(id, '單篇檔案缺少 paragraphs 陣列。');
      continue;
    }
    if (!Number.isInteger(entry.paragraphCount) || entry.paragraphCount !== article.paragraphs.length) {
      fail(id, 'paragraphCount 為 ' + (entry.paragraphCount ?? '未填') + '，但實際有 ' + article.paragraphs.length + ' 段。');
    }
    if (entry.ready === true) {
      if (article.paragraphs.length === 0) fail(id, 'ready 文章至少要有一段原文。');
      const dailyFrom = entry.dailyFrom;
      const parsedDate = typeof dailyFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dailyFrom)
        ? new Date(dailyFrom + 'T00:00:00Z') : null;
      if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dailyFrom) {
        fail(id, 'ready 文章必須提供有效的 dailyFrom（YYYY-MM-DD）。');
      }
    }

    for (const [paragraphIndex, paragraph] of article.paragraphs.entries()) {
      const paragraphLabel = id + ' 第 ' + (paragraphIndex + 1) + ' 段';
      if (!paragraph || !nonEmptyText(paragraph.text)) {
        fail(paragraphLabel, '原文 text 不可留空。');
        continue;
      }
      if (paragraph.notes !== undefined && !Array.isArray(paragraph.notes)) {
        fail(paragraphLabel, 'notes 必須是陣列。');
        continue;
      }
      if (entry.ready === true) {
        for (const field of ['summary', 'analysis']) {
          if (!nonEmptyText(paragraph[field])) fail(paragraphLabel, field + ' 不可留空。');
        }
        if (entry.type === 'classical') {
          if (!nonEmptyText(paragraph.translation)) fail(paragraphLabel, '文言文 translation 不可留空。');
          if (paragraph.notes === undefined || (Array.isArray(paragraph.notes) && paragraph.notes.length === 0)) {
            fail(paragraphLabel, '文言文 ready 文章每段至少要有一項注釋。');
          }
        }
      }
      for (const [noteIndex, note] of (paragraph.notes || []).entries()) {
        const noteLabel = paragraphLabel + ' 第 ' + (noteIndex + 1) + ' 則注釋';
        if (typeof note?.term !== 'string' || !note.term.trim()) {
          fail(noteLabel, 'term 不可留空。');
        } else if (!paragraph.text.includes(note.term)) {
          fail(noteLabel, 'term「' + note.term + '」未出現在該段原文。');
        }
        if (typeof note?.explanation !== 'string' || !note.explanation.trim()) {
          fail(noteLabel, 'explanation 不可留空。');
        }
      }
    }
  }

  for (const filename of availableFiles) {
    if (!referencedFiles.has(filename)) fail(filename, '資料檔未在索引中登記。');
  }
  return errors;
}

function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(scriptDir, '..');
  const articleDir = path.join(rootDir, 'data', 'articles');

  let index;
  try {
    index = JSON.parse(fs.readFileSync(path.join(articleDir, 'index.json'), 'utf8'));
  } catch (error) {
    console.error('無法讀取 data/articles/index.json（' + error.message + '）。');
    process.exitCode = 1;
    return;
  }

  let files;
  try {
    files = fs.readdirSync(articleDir);
  } catch (error) {
    console.error('無法讀取 data/articles 資料夾（' + error.message + '）。');
    process.exitCode = 1;
    return;
  }

  const errors = validateArticleData(index, files, filename => {
    return JSON.parse(fs.readFileSync(path.join(articleDir, filename), 'utf8'));
  });

  if (errors.length) {
    for (const error of errors) console.error('✗ ' + error);
    console.error('文章資料檢查發現 ' + errors.length + ' 項問題。');
    process.exitCode = 1;
    return;
  }

  console.log('文章資料檢查通過：' + index.articles.length + ' 篇。');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
