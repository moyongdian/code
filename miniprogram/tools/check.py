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


def check_components(app):
    """校验 usingComponents 引用：相对路径必须真实存在；同时检查 WXML 用到的
    自定义组件是否已在页面（或 app.json 全局）注册。"""
    global_comps = set((app.get('usingComponents') or {}).keys())

    # 1) 所有 usingComponents 指向的组件文件必须存在
    json_files = ['app.json']
    for dp, _, fs in os.walk('pages'):
        json_files += [os.path.join(dp, f) for f in fs if f.endswith('.json')]
    for jf in json_files:
        try:
            j = json.load(open(jf, encoding='utf-8'))
        except Exception:
            continue
        for name, ref in (j.get('usingComponents') or {}).items():
            base = os.path.dirname(jf)
            p = os.path.normpath(os.path.join(base, ref))
            # 组件可以是 index.json/index.wxml 这类文件组，也可以是目录
            is_file_group = os.path.exists(p + '.json') and os.path.exists(p + '.wxml')
            is_dir = os.path.isdir(p) and os.path.exists(os.path.join(p, 'index.json'))
            if not (is_file_group or is_dir):
                errors.append(f'{jf}: 组件 "{name}" 指向的路径不存在: {ref}')
            elif is_file_group:
                # 文件组形式必须同时具备 js/json/wxml（wxss 可选，部分组件无样式）
                for ext in ('js', 'json', 'wxml'):
                    if not os.path.exists(p + '.' + ext):
                        errors.append(f'{jf}: 组件 "{name}" 缺少 index.{ext}: {ref}')

    # 第三方组件包：仅「真正的组件目录」（含 index.json）需要四件套中的 js/json/wxml
    # 注意 common/ 与 wxs/ 是共享模块目录，不是组件，不应按组件完整性要求校验
    if os.path.isdir('vant'):
        comps = [d for d in sorted(os.listdir('vant'))
                 if os.path.isfile(os.path.join('vant', d, 'index.json'))]
        stats['vant'] = len(comps)
        for c in comps:
            for ext in ('js', 'json', 'wxml'):
                f = os.path.join('vant', c, 'index.' + ext)
                if not os.path.exists(f):
                    errors.append(f'vant 组件不完整: 缺少 {f}')

    # 2) WXML 里用到的自定义组件（含连字符的非内置标签）须已注册
    builtin = {'scroll-view', 'swiper', 'swiper-item', 'movable-area', 'movable-view',
               'cover-view', 'cover-image', 'rich-text', 'web-view', 'open-data',
               'functional-page-navigator', 'official-account', 'navigation-bar',
               'page-meta', 'match-media', 'keyboard-accessory', 'picker-view',
               'picker-view-column', 'checkbox-group', 'radio-group', 'root-portal',
               'share-element', 'page-container', 'voip-room', 'ad-custom', 'channel-live',
               'channel-video', 'inline-payment-panel', 'grid-view', 'list-view',
               'snapshot', 'double-tap-gesture-handler', 'scale-gesture-handler',
               'pan-gesture-handler', 'tap-gesture-handler', 'vertical-drag-gesture-handler',
               'horizontal-drag-gesture-handler', 'force-press-gesture-handler',
               'long-press-gesture-handler', 'draggable-sheet', 'nested-scroll-header',
               'nested-scroll-body', 'span', 'wxs'}
    for p in collect_wxml():
        s = open(p, encoding='utf-8').read()
        used = set()
        for m in re.finditer(r'<([a-z][a-z0-9]*-[a-z0-9-]+)[\s/>]', s):
            tag = m.group(1)
            if tag in builtin or tag.startswith('van-') and False:
                continue
            used.add(tag)
        if not used:
            continue
        pj = p[:-5] + '.json'
        local = set()
        if os.path.exists(pj):
            try:
                local = set((json.load(open(pj, encoding='utf-8')).get('usingComponents') or {}).keys())
            except Exception:
                pass
        for tag in sorted(used):
            if tag in global_comps or tag in local:
                continue
            # wxs / template 等非组件标签排除
            if tag.startswith('wxs') or tag.startswith('template'):
                continue
            errors.append(f'{p}: 使用了未注册组件 <{tag}>（页面 json 与 app.json 均未声明）')


def check_icons():
    """校验 van-icon 的 name 是否为真实存在的 vant 图标。
    图标名写错不会报错，只会静默显示空白，因此必须静态校验。"""
    css = 'vant/icon/index.wxss'
    if not os.path.exists(css):
        warnings.append('未找到 vant/icon/index.wxss，跳过图标名校验')
        return
    src = open(css, encoding='utf-8').read()
    known = set(re.findall(r'\.van-icon-([a-z0-9-]+):before', src))
    if not known:
        warnings.append('未能从 vant 图标样式中解析出图标名')
        return
    stats['icons'] = len(known)

    # 1) WXML：van-icon 的 name 字面量
    for p in collect_wxml():
        s = open(p, encoding='utf-8').read()
        for m in re.finditer(r'<van-icon[^>]*\bname="([^"{}]+)"', s):
            name = m.group(1).strip()
            if name and name not in known:
                line = s[:m.start()].count('\n') + 1
                errors.append(f'{p}:{line} van-icon 图标名不存在: "{name}"')

    # 2) JS：icon: 'xxx' / icon = 'xxx' 形式的图标名（覆盖 categoryIcon 等映射）
    for dp, _, fs in os.walk('.'):
        if dp.startswith('./vant') or dp.startswith('vant') or 'node_modules' in dp:
            continue
        for f in fs:
            if not f.endswith('.js'):
                continue
            p = os.path.join(dp, f)
            js = open(p, encoding='utf-8').read()
            # 排除 wx.showToast 的 icon 参数（none/success/loading/error）
            TOAST_ICONS = {'none', 'success', 'loading', 'error', 'success_no_circle'}
            for m in re.finditer(r"""\bicon['"]?\s*[:=]\s*['"]([a-z0-9-]+)['"]""", js):
                name = m.group(1)
                if name in TOAST_ICONS or name not in known:
                    if name not in TOAST_ICONS:
                        errors.append(f'{p}: JS 中引用的图标名不存在: "{name}"')
            # 数组/对象里成对出现的 [正则, '图标名']
            for m in re.finditer(r"""\[\s*/[^/]+/\s*,\s*['"]([a-z0-9-]+)['"]\s*\]""", js):
                name = m.group(1)
                if name not in known:
                    errors.append(f'{p}: JS 中引用的图标名不存在: "{name}"')


def check_dependencies():
    """第三方组件包的完整依赖校验。
    组件的依赖有四类，缺任一类都会在开发者工具中报编译错误：
      1) JSON  usingComponents
      2) WXML <wxs src="...">
      3) WXSS @import
      4) WXML <template|import|include src="...">
    （本项目曾因只解析 usingComponents 而漏掉 wxs/ 与 common/ 目录）
    """
    if not os.path.isdir('vant'):
        return
    for dp, _, fs in os.walk('vant'):
        for f in fs:
            p = os.path.join(dp, f)
            try:
                s = open(p, encoding='utf-8', errors='ignore').read()
            except Exception:
                continue

            if f.endswith('.json'):
                try:
                    j = json.loads(s)
                except Exception:
                    continue
                for name, ref in (j.get('usingComponents') or {}).items():
                    c = os.path.normpath(os.path.join(dp, ref))
                    if not (os.path.exists(c + '.json') and os.path.exists(c + '.wxml')):
                        errors.append(f'{p}: usingComponents "{name}" 缺失 -> {ref}')

            if f.endswith('.wxml'):
                for m in re.finditer(r'<wxs[^>]*src="([^"]+)"', s):
                    c = os.path.normpath(os.path.join(dp, m.group(1)))
                    if not os.path.exists(c):
                        errors.append(f'{p}: <wxs src="{m.group(1)}"> 文件缺失（wxs 是共享模块，勿遗漏）')
                for m in re.finditer(r'<(?:template|import|include)[^>]*src="([^"]+)"', s):
                    c = os.path.normpath(os.path.join(dp, m.group(1)))
                    if not os.path.exists(c):
                        errors.append(f'{p}: <template src="{m.group(1)}"> 文件缺失')

            if f.endswith('.wxss'):
                for m in re.finditer(r'@import\s+["\']([^"\']+)["\']', s):
                    ref = m.group(1)
                    if ref.startswith(('http', '//', '/')):
                        continue
                    c = os.path.normpath(os.path.join(dp, ref))
                    if not os.path.exists(c):
                        errors.append(f'{p}: @import "{ref}" 文件缺失')

            if f.endswith('.js'):
                for m in re.finditer(r"require\(['\"]([^'\"]+)['\"]\)", s):
                    ref = m.group(1)
                    if not ref.startswith('.'):
                        continue
                    c = os.path.normpath(os.path.join(dp, ref))
                    if not (os.path.exists(c) or os.path.exists(c + '.js')):
                        errors.append(f'{p}: require("{ref}") 文件缺失')


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

    # 所有 JSON 合法性（排除第三方组件目录）
    for dp, _, fs in os.walk('.'):
        if 'node_modules' in dp or dp.startswith('./vant') or dp.startswith('vant'):
            continue
        for f in fs:
            if f.endswith('.json'):
                p = os.path.join(dp, f)
                try:
                    json.load(open(p, encoding='utf-8'))
                except Exception as e:
                    errors.append(f'JSON 解析失败 {p}: {e}')

    check_components(app)


def check_wxml_tags():
    """标签闭合 + 事件处理函数存在性（启发式）"""
    void = {'input', 'image', 'br', 'hr', 'import', 'include', 'wxs'}
    for p in collect_wxml():
        s = open(p, encoding='utf-8').read()
        s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
        stack = []
        # 注意：属性可能跨行，故用 [\s\S] 而非 [^>]（后者会跨越标签边界）
        for m in re.finditer(r'<(/?)([a-zA-Z][\w-]*)((?:[^>"\']|"[^"]*"|\'[^\']*\')*?)(/?)>', s, re.S):
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
    check_icons()
    check_dependencies()

    print('=' * 66)
    print(f"页面 {stats['pages']} 个 | WXML {stats['wxml']} 个 | 表达式 {stats['expr']} 个 | "
          f"可用图标 {stats.get('icons','?')} 个 | vant 组件 {stats.get('vant','?')} 个")
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
