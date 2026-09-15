#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小程序静态校验：WXML 表达式 + 工程结构

背景：微信 WXML 的表达式能力远弱于 JavaScript，例如
    {{(user.name || user.username || 'U')[0]}}
会直接报编译错误（unexpected token '['）。Node 侧的联调测试台
无法发现这类问题，因此单独提供本脚本做静态校验。

用法：
    python3 miniprogram/tools/check.py
"""
import json
import os
import re
import sys

MP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(MP)

# WXML 不支持的写法：(正则, 说明)
UNSUPPORTED = [
    (re.compile(r'\{\{[^}]*\)\s*\['),
     'WXML 不支持对括号表达式取下标，如 {{(a || b)[0]}}'),
    (re.compile(r'\{\{[^}]*(\|\||\?|\+|-|\*)[^}]*\[[0-9]+\]'),
     'WXML 不支持对含运算符的表达式取下标'),
    (re.compile(r'\{\{[^}]*\.(slice|charAt|toFixed|substring|substr|trim|replace|split|join|toLowerCase|toUpperCase)\s*\('),
     'WXML 不支持调用字符串方法'),
    (re.compile(r'\{\{[^}]*\.(filter|map|find|reduce|forEach|some|every|sort|concat|includes|indexOf)\s*\('),
     'WXML 不支持调用数组方法'),
    (re.compile(r'\{\{[^}]*=>'),
     'WXML 不支持箭头函数'),
    (re.compile(r'\{\{[^}]*\bnew\s+\w'),
     'WXML 不支持 new'),
    (re.compile(r'\{\{[^}]*\bfunction\b'),
     'WXML 不支持 function 关键字'),
    (re.compile(r'\{\{[^}]*\bMath\.'),
     'WXML 不支持 Math 对象'),
    (re.compile(r'\{\{[^}]*\bDate\b'),
     'WXML 不支持 Date 对象'),
]

errors = []
warnings = []
stats = {'expr': 0, 'wxml': 0, 'pages': 0}


def collect_wxml():
    out = []
    for dp, _, fs in os.walk('pages'):
        for f in fs:
            if f.endswith('.wxml'):
                out.append(os.path.join(dp, f))
    return sorted(out)


def check_expressions():
    for p in collect_wxml():
        stats['wxml'] += 1
        s = open(p, encoding='utf-8').read()
        for m in re.finditer(r'\{\{(.*?)\}\}', s, re.S):
            stats['expr'] += 1
            raw = '{{' + m.group(1) + '}}'
            expr = m.group(1).strip()
            for rx, msg in UNSUPPORTED:
                if rx.search(raw):
                    line = s[:m.start()].count('\n') + 1
                    errors.append(f'{p}:{line}  {msg}\n        表达式: {expr[:90]}')


def check_structure():
    try:
        app = json.load(open('app.json', encoding='utf-8'))
    except Exception as e:
        errors.append(f'app.json 解析失败: {e}')
        return
    pages = app.get('pages', [])
    stats['pages'] = len(pages)

    for pg in pages:
        for ext in ('js', 'wxml', 'wxss', 'json'):
            if not os.path.exists(f'{pg}.{ext}'):
                errors.append(f'缺少文件: {pg}.{ext}')

    for it in (app.get('tabBar') or {}).get('list', []):
        if it['pagePath'] not in pages:
            errors.append(f'tabBar 页面未在 pages 注册: {it["pagePath"]}')
        for k in ('iconPath', 'selectedIconPath'):
            if k in it and not os.path.exists(it[k]):
                errors.append(f'tabBar 图标缺失: {it[k]}')
        if not it.get('text'):
            errors.append(f'tabBar text 为空: {it["pagePath"]}')

    dirs = {d for d in os.listdir('pages') if os.path.isdir(os.path.join('pages', d))}
    registered = {p.split('/')[1] for p in pages}
    for d in sorted(dirs - registered):
        errors.append(f'pages/{d} 未在 app.json 注册')
    for d in sorted(registered - dirs):
        errors.append(f'app.json 声明了 pages/{d} 但目录不存在')

    # 所有 JSON 合法性
    for dp, _, fs in os.walk('.'):
        if 'node_modules' in dp:
            continue
        for f in fs:
            if f.endswith('.json'):
                p = os.path.join(dp, f)
                try:
                    json.load(open(p, encoding='utf-8'))
                except Exception as e:
                    errors.append(f'JSON 解析失败 {p}: {e}')


def check_wxml_tags():
    """标签闭合 + 事件处理函数存在性（启发式）"""
    void = {'input', 'image', 'br', 'hr', 'import', 'include', 'wxs'}
    for p in collect_wxml():
        s = open(p, encoding='utf-8').read()
        s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
        stack = []
        for m in re.finditer(r'<(/?)([a-zA-Z][\w-]*)([^>]*?)(/?)>', s):
            closing, name, _, selfclose = m.groups()
            if name.lower() in void:
                continue
            if closing:
                if not stack or stack[-1] != name:
                    errors.append(f'{p}: 标签不匹配 </{name}>（栈顶 {stack[-1] if stack else "空"}）')
                else:
                    stack.pop()
            elif not selfclose:
                stack.append(name)
        if stack:
            errors.append(f'{p}: 未闭合标签 {stack}')

        js = p[:-5] + '.js'
        if os.path.exists(js):
            j = open(js, encoding='utf-8').read()
            handlers = set(re.findall(r'\b(?:bind|catch):?[a-z]+="([A-Za-z_$][\w$]*)"', s))
            for h in handlers:
                if not re.search(r'\b' + re.escape(h) + r'\s*[:(]', j):
                    warnings.append(f'{p}: 事件处理函数 {h} 未在 {os.path.basename(js)} 中找到')


def main():
    check_expressions()
    check_structure()
    check_wxml_tags()

    print('=' * 66)
    print(f"页面 {stats['pages']} 个 | WXML {stats['wxml']} 个 | 表达式 {stats['expr']} 个")
    print('=' * 66)
    if errors:
        print(f'\n❌ 错误 {len(errors)} 项：')
        for e in errors:
            print('  - ' + e)
    else:
        print('\n✅ 静态校验通过：WXML 表达式合法、结构完整、标签闭合')
    if warnings:
        print(f'\n⚠️  需人工确认 {len(warnings)} 项（启发式，可能误报）：')
        for w in warnings[:20]:
            print('  - ' + w)
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
