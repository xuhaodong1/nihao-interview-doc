#!/bin/bash
# 使用 pandoc 将 Markdown 文档导出为 EPUB
# 依赖: brew install pandoc

set -e

DOCS_DIR="docs"
OUTPUT="nihao-interview.epub"
TITLE="NIHAO 面试宝典"
AUTHOR="NIHAO"

# 按章节顺序收集 Markdown 文件
FILES=(
  "$DOCS_DIR/ios/index.md"
  "$DOCS_DIR/cpp/index.md"
  "$DOCS_DIR/deep-learning/index.md"
  "$DOCS_DIR/machine-learning/index.md"
  "$DOCS_DIR/on-device-ai/index.md"
  "$DOCS_DIR/resume/index.md"
  "$DOCS_DIR/interview-prep/index.md"
)

# 过滤存在的文件, 并收集各章节下所有 md 文件
INPUT_FILES=()
for dir in ios cpp deep-learning machine-learning on-device-ai resume interview-prep; do
  for f in "$DOCS_DIR/$dir"/*.md; do
    [ -f "$f" ] && INPUT_FILES+=("$f")
  done
done

if [ ${#INPUT_FILES[@]} -eq 0 ]; then
  echo "No markdown files found."
  exit 1
fi

pandoc "${INPUT_FILES[@]}" \
  --metadata title="$TITLE" \
  --metadata author="$AUTHOR" \
  --toc \
  --toc-depth=2 \
  -o "$OUTPUT"

echo "Exported to $OUTPUT"
