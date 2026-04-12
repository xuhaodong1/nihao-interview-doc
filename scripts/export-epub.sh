#!/bin/bash
# 使用 pandoc 将 Markdown 文档导出为 EPUB
# 依赖: brew install pandoc

set -e

DOCS_DIR="docs"
TITLE="NIHAO 面试宝典"
AUTHOR="NIHAO"

# 生成带时间标识的输出目录和文件名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_DIR="exports/${TIMESTAMP}"
OUTPUT="${OUTPUT_DIR}/nihao-interview_${TIMESTAMP}.epub"

mkdir -p "$OUTPUT_DIR"

# 按章节顺序收集各目录下所有 md 文件
INPUT_FILES=()
for dir in ios swift-objc cpp algorithm network os database design-patterns deep-learning machine-learning on-device-ai system-design resume interview-prep; do
  for f in "$DOCS_DIR/$dir"/*.md; do
    [ -f "$f" ] && INPUT_FILES+=("$f")
  done
done

if [ ${#INPUT_FILES[@]} -eq 0 ]; then
  echo "No markdown files found."
  exit 1
fi

# 创建临时目录，将图片路径从 /images/ 替换为实际路径
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

PROCESSED_FILES=()
for f in "${INPUT_FILES[@]}"; do
  tmp_file="$TMP_DIR/$(basename "$f")"
  sed "s|](/images/|](docs/public/images/|g; s|src=\"/images/|src=\"docs/public/images/|g" "$f" > "$tmp_file"
  PROCESSED_FILES+=("$tmp_file")
done

pandoc "${PROCESSED_FILES[@]}" \
  --metadata title="$TITLE" \
  --metadata author="$AUTHOR" \
  --toc \
  --toc-depth=2 \
  -o "$OUTPUT"

echo "Exported to $OUTPUT"
