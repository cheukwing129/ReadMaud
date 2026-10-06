import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateArticleData(index, articleFiles, readArticle) {
  const errors = [];
  const fail = (where, message) => errors.push(where + '：' + message);

  if (!index || index.schemaVersion !== 1 || !Array.isArray(index.articles)) {
    return ['data/articles/index.json：索引格式錯誤，預期 schemaVersion 為 1，且 articles 為陣列。'];
  }

  const availableFiles = new Set(
    articleFiles.filter(name => name.endsWith('.json') && name !== 'index.json')
  );
  const referencedFiles = new Set();
  const seenIds = new Set();

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
    if (!Array.isArray(article?.paragraphs)) {
      fail(id, '單篇檔案缺少 paragraphs 陣列。');
      continue;
    }
    if (!Number.isInteger(entry.paragraphCount) || entry.paragraphCount !== article.paragraphs.length) {
      fail(id, 'paragraphCount 為 ' + (entry.paragraphCount ?? '未填') + '，但實際有 ' + article.paragraphs.length + ' 段。');
    }

    for (const [paragraphIndex, paragraph] of article.paragraphs.entries()) {
      const paragraphLabel = id + ' 第 ' + (paragraphIndex + 1) + ' 段';
      if (!paragraph || typeof paragraph.text !== 'string') {
        fail(paragraphLabel, '原文 text 必須是字串。');
        continue;
      }
      if (paragraph.notes !== undefined && !Array.isArray(paragraph.notes)) {
        fail(paragraphLabel, 'notes 必須是陣列。');
        continue;
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
