#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""自动更新 README 中的更新日志"""
import subprocess
import re
from datetime import datetime

def get_git_commits(limit=20):
    """获取最近的 git 提交记录"""
    cmd = ['git', 'log', '--pretty=format:%h|%ad|%s', '--date=short', f'-{limit}']
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    commits = []
    for line in result.stdout.strip().split('\n'):
        if line:
            hash_id, date, message = line.split('|', 2)
            commits.append({'hash': hash_id, 'date': date, 'message': message})
    return commits

def format_changelog(commits):
    """格式化更新日志"""
    changelog = "## 📝 更新日志\n\n"

    # 按日期分组
    by_date = {}
    for commit in commits:
        date = commit['date']
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(commit)

    # 生成日志
    for date in sorted(by_date.keys(), reverse=True):
        changelog += f"### {date}\n\n"
        for commit in by_date[date]:
            msg = commit['message']
            # 提取类型和描述
            if ':' in msg:
                type_part, desc = msg.split(':', 1)
                type_part = type_part.strip()
                desc = desc.strip()
                # 识别类型
                if 'feat' in type_part:
                    icon = '✨'
                elif 'fix' in type_part:
                    icon = '🐛'
                elif 'refactor' in type_part:
                    icon = '♻️'
                elif 'docs' in type_part:
                    icon = '📝'
                elif 'chore' in type_part:
                    icon = '🔧'
                else:
                    icon = '📌'
                changelog += f"- {icon} {desc} ([`{commit['hash']}`](https://github.com/Sam5440/QBank2Xlsx/commit/{commit['hash']}))\n"
            else:
                changelog += f"- 📌 {msg} ([`{commit['hash']}`](https://github.com/Sam5440/QBank2Xlsx/commit/{commit['hash']}))\n"
        changelog += "\n"

    return changelog

def update_readme(changelog):
    """更新 README 文件"""
    with open('README.md', 'r', encoding='utf-8') as f:
        content = f.read()

    # 查找插入位置（在许可证之前）
    license_pattern = r'## 📄 许可证'

    # 删除旧的更新日志（如果存在）
    content = re.sub(r'## 📝 更新日志.*?(?=## 📄 许可证)', '', content, flags=re.DOTALL)

    # 插入新的更新日志
    content = re.sub(license_pattern, f'{changelog}---\n\n{license_pattern}', content)

    with open('README.md', 'w', encoding='utf-8') as f:
        f.write(content)

    print("README.md updated successfully")

if __name__ == '__main__':
    commits = get_git_commits(20)
    changelog = format_changelog(commits)
    update_readme(changelog)
