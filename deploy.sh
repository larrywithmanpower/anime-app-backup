#!/bin/bash

# 1. 初始化 Git 存儲庫
if [ ! -d ".git" ]; then
    git init
    echo "✅ 已初始化 Git"
fi

# 2. 設定遠端倉庫
git remote remove origin 2>/dev/null
git remote add origin https://github.com/larrywithmanpower/anime-app-backup.git
echo "✅ 已關聯遠端倉庫: https://github.com/larrywithmanpower/anime-app-backup.git"

# 3. 提交程式碼
git add .
git commit -m "feat: complete anime tracker with github pages support and direct GAS connection"
echo "✅ 已提交變動"

# 4. 推送到 GitHub
git branch -M main
echo "🚀 正在推送至 GitHub (可能需要您輸入帳號密碼或 Token)..."
git push -u origin main

echo ""
echo "🎉 推送完成！接下來請到 GitHub 設定 Secrets："
echo "1. Settings > Secrets and variables > Actions"
echo "2. 新增 NEXT_PUBLIC_APPS_SCRIPT_URL"
