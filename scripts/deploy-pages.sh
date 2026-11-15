#!/usr/bin/env bash
# Builds the site for GitHub Pages and publishes dist/ to the gh-pages branch.
set -e
REPO_URL="$(git remote get-url origin)"
NAME="$(basename -s .git "$REPO_URL")"
PAGES_REPO="$NAME" npm run build
cd dist
touch .nojekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" commit -q -m "Publish demo"
git push -q -f "$REPO_URL" gh-pages
rm -rf .git
echo "published to gh-pages"
