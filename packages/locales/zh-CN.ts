// ==================== layout 内置文案（简体中文） ====================
const layoutMessages = {
  // 工具栏-主题菜单
  'toolbar.followSystem': '跟随系统',
  'toolbar.lightTheme': '浅色主题',
  'toolbar.darkTheme': '暗黑主题',
  'toolbar.colorWeak': '色弱模式',

  // 标签栏-右键菜单 / 下拉操作
  'tabBar.reload': '重新加载',
  'tabBar.pin': '固定',
  'tabBar.unpin': '取消固定',
  'tabBar.maximize': '最大化',
  'tabBar.closeTab': '关闭标签页',
  'tabBar.closeOtherTabs': '关闭其他标签页',
  'tabBar.closeLeftTabs': '关闭左侧标签页',
  'tabBar.closeRightTabs': '关闭右侧标签页',
  'tabBar.search': '搜索',

  // 搜索
  'search.trigger': '搜索',
  'search.placeholder': '支持标题、URL模糊查询',
  'search.empty': '输入你要搜索的导航',
  'search.noResult': '没有找到你想要的',
  'search.switch': '切换',
  'search.jump': '跳转',
  'search.close': '关闭',

  // 用户信息
  'userInfo.profile': '用户信息',
  'userInfo.preferences': '偏好设置',
  'userInfo.shortcuts': '快捷键',
  'userInfo.feedback': '反馈',
  'userInfo.loggingOut': '退出中...',
  'userInfo.logout': '退出登录',
  'userInfo.logoutFailed': '退出失败，请重试',
  'userInfo.notLoggedIn': '未登录',

  // 个人资料弹窗
  'profile.passwordChanged': '密码修改成功，请重新登录',
  'profile.defaultRole': '普通用户',
  'profile.accountNormal': '账号正常',
  'profile.accountDisabled': '已禁用',
  'profile.lastLogin': '最后登录',
  'profile.title': '个人资料',
  'profile.username': '用户名',
  'profile.nickname': '昵称',
  'profile.email': '邮箱',
  'profile.accountStatus': '账号状态',
  'profile.statusEnabled': '启用',
  'profile.statusDisabled': '禁用',
  'profile.role': '角色',
  'profile.lastLoginTime': '最后登录时间',
  'profile.changePassword': '修改密码',
  'profile.oldPassword': '旧密码',
  'profile.oldPasswordRequired': '请输入旧密码',
  'profile.oldPasswordPlaceholder': '请输入当前密码',
  'profile.newPassword': '新密码',
  'profile.newPasswordRequired': '请输入新密码',
  'profile.passwordLength': '密码长度为 6-20 位',
  'profile.passwordSame': '新密码不能与旧密码相同',
  'profile.newPasswordPlaceholder': '6-20 位新密码',
  'profile.confirmPassword': '确认新密码',
  'profile.confirmPasswordRequired': '请再次输入新密码',
  'profile.passwordMismatch': '两次输入的密码不一致',
  'profile.confirmPasswordPlaceholder': '请再次输入新密码',
  'profile.submit': '确认修改',
  'profile.tip': '修改成功后需重新登录，请妥善保管新密码',

  // 快捷键弹窗
  'shortcuts.title': '快捷键',
  'shortcuts.global': '全局',
  'shortcuts.viewSystemInfo': '查看系统信息',
  'shortcuts.openSearch': '唤起导航搜索',
  'shortcuts.tabBar': '标签栏',
  'shortcuts.prevTab': '切换到上一个标签页',
  'shortcuts.nextTab': '切换到下一个标签页',
  'shortcuts.closeCurrentTab': '关闭当前标签页',
  'shortcuts.nthTab': '切换到第 n 个标签页',
  'shortcuts.lastTab': '切换到最后一个标签页',
  'shortcuts.page': '页面',
  'shortcuts.maximize': '最大化',
  'shortcuts.exitMaximize': '退出最大化',

  // 系统信息弹窗
  'systemInfo.browser': '浏览器',
  'systemInfo.os': '操作系统',
  'systemInfo.language': '语言',
  'systemInfo.resolution': '屏幕分辨率',
  'systemInfo.viewport': '视口大小',
  'systemInfo.url': '当前地址',
  'systemInfo.unknown': '未知',

  // 反馈弹窗
  'feedback.title': '反馈',
  'feedback.captureTip': '使用屏幕截图可以帮助我们更好地了解问题，点击下方按钮截取当前屏幕内容',
  'feedback.captureButton': '截图当前页面',
  'feedback.capturing': '正在生成截图...',
  'feedback.captureFailed': '截图失败，请重试',
  'feedback.delete': '删除截图',
  'feedback.descriptionRequired': '请填写问题描述',
  'feedback.submit': '提交',
  'feedback.submitSuccess': '反馈提交成功（模拟）',

  // 重新登录弹窗
  'reLogin.title': '登录已过期',
  'reLogin.okText': '重新登录',
  'reLogin.cancelText': '退出',
  'reLogin.tip': '你的登录凭证已失效，请重新输入用户名和密码',
  'reLogin.usernameRequired': '请输入用户名',
  'reLogin.username': '用户名',
  'reLogin.passwordRequired': '请输入密码',
  'reLogin.passwordMin': '密码不能小于3位',
  'reLogin.password': '密码',

  // 移动端拦截
  'mobile.block': '抱歉，本网站不支持移动设备访问，请切换到桌面设备',

  // 配置面板（ConfigPanel）
  'configPanel.title.dev': '应用配置',
  'configPanel.title.user': '个人偏好',
  'configPanel.tip.production': '在生产环境该模块会自动关闭，仅保留用户的偏好设置',
  'configPanel.tip.copy': '调整配置仅临时生效，想真正应用于项目，请点击「复制配置」按钮，并粘贴到 packages/layout/defaultSettings.ts 文件中',
  'configPanel.copy': '复制配置',
  'configPanel.copied': '配置已复制到剪贴板',
  'configPanel.reset': '重置',
  // 通用复用文案
  'configPanel.common.default': '默认',
  'configPanel.common.fixed': '固定',
  'configPanel.common.sticky': '粘性',
  'configPanel.common.enable': '启用',
  'configPanel.common.title': '标题',
  'configPanel.common.search': '搜索',
  // 主题
  'configPanel.theme': '主题',
  'configPanel.themeType': '主题类型',
  'configPanel.colorScheme': '颜色方案',
  'configPanel.colorWeak': '色弱模式',
  'configPanel.themeType.illustration': '插画',
  'configPanel.themeType.cartoon': '卡通',
  'configPanel.themeType.shadcn': 'Shadcn',
  'configPanel.themeType.mui': 'MUI',
  'configPanel.themeType.bootstrap': 'Bootstrap',
  'configPanel.themeType.hacker': '黑客',
  'configPanel.themeType.glass': '玻璃',
  // 页面
  'configPanel.page': '页面',
  'configPanel.page.loadProgress': '载入进度条',
  'configPanel.transition.fadeIn': '淡入淡出',
  'configPanel.transition.fadeUp': '向上淡入',
  'configPanel.transition.fadeDown': '向下淡入',
  'configPanel.transition.fadeLeft': '向左淡入',
  'configPanel.transition.fadeRight': '向右淡入',
  // 导航菜单
  'configPanel.menu': '导航菜单',
  'configPanel.menu.accordion': '次导航手风琴模式',
  'configPanel.menu.collapseBtn': '启用次导航折叠按钮',
  'configPanel.menu.subCollapse': '次导航折叠',
  'configPanel.menuType.side': '侧边栏模式',
  'configPanel.menuType.onlySide': '侧边栏精简模式',
  'configPanel.menuType.head': '顶部模式',
  'configPanel.menuType.onlyHead': '顶部精简模式',
  'configPanel.menuType.simple': '精简模式（不包含主导航）',
  // 顶栏
  'configPanel.topBar': '顶栏',
  'configPanel.topBar.swap': '展示切换',
  'configPanel.topBar.position': '定位',
  // 工具栏
  'configPanel.toolbar': '工具栏',
  'configPanel.toolbar.breadcrumb': '面包屑',
  'configPanel.toolbar.breadcrumbStyle': '面包屑样式',
  'configPanel.toolbar.breadcrumbStyle.modern': '时尚',
  'configPanel.toolbar.showHome': '显示首页',
  'configPanel.toolbar.i18n': '国际化',
  'configPanel.toolbar.reload': '页面重载',
  'configPanel.toolbar.fullscreen': '全屏',
  'configPanel.toolbar.theme': '颜色主题',
  // 标签栏
  'configPanel.tabBar': '标签栏',
  'configPanel.tabBar.style': '样式风格',
  'configPanel.tabBar.style.card': '卡片',
  'configPanel.tabBar.style.block': '方块',
  'configPanel.tabBar.showIcon': '显示图标',
  'configPanel.tabBar.dblClick': '双击标签页',
  'configPanel.tabBar.dblClick.refresh': '刷新',
  'configPanel.tabBar.dblClick.close': '关闭',
  'configPanel.tabBar.dblClick.fixed': '固定/取消固定',
  'configPanel.tabBar.dblClick.max': '最大化',
  'configPanel.tabBar.dblClick.open': '新窗口打开',
  'configPanel.tabBar.widthType': '标签页宽度',
  'configPanel.tabBar.widthType.auto': '自动',
  'configPanel.tabBar.widthType.autoMin': '自适应（最小宽度）',
  'configPanel.tabBar.widthType.autoMax': '自适应（最大宽度）',
  // 应用
  'configPanel.app': '应用',
  'configPanel.app.mobileAccess': '移动端访问',
  'configPanel.app.dynamicTitle': '动态标题',
  'configPanel.app.mourning': '哀悼模式',
  'configPanel.app.watermark': '水印',
  'configPanel.app.account': '账号',
  'configPanel.app.permission': '权限验证',
  'configPanel.app.expireMode': '过期模式',
  'configPanel.app.expireMode.logout': '重定向登录页',
  'configPanel.app.expireMode.prompt': '弹出登录窗口',
  'configPanel.app.multiAccount': '多账号管理',
  'configPanel.app.homePage': '主页',
  'configPanel.app.layout': '布局',
  'configPanel.app.center': '居中显示',
  'configPanel.app.layoutScope': '作用范围',
  'configPanel.app.layoutScope.inside': '内部',
  'configPanel.app.layoutScope.outside': '外部',
  'configPanel.app.centerWidth': '居中宽度',
  'configPanel.app.copyright': '版权',
  'configPanel.app.date': '日期',
  'configPanel.app.company': '公司',
  'configPanel.app.website': '网站',
}

// ==================== 应用侧文案：菜单多语言映射（简体中文） ====================
// key 为菜单路径（MenuItem.key），value 为对应语言的菜单名称
// 菜单多语言统一由前端维护，作为菜单名称的单一数据源
const menuMessages = {
  '/': '主页',
  '/demo': '演示',
  '/demo/style': '风格实验室',
  '/demo/nav': '多级导航',
  '/demo/nav/nav1': '导航1',
  '/demo/nav/nav2': '导航2',
  '/demo/nav/nav2/nav2-1': '导航2-1',
  '/demo/nav/nav2/nav2-2': '导航2-2',
  '/demo/nav/nav2/nav2-2/nav2-2-1': '导航2-2-1',
  '/demo/nav/nav2/nav2-2/nav2-2-2': '导航2-2-2',
  '/demo/components': '组件',
  '/demo/components/sparkles-text': '闪烁文字',
  '/demo/components/slider-captcha': '滑块验证码',
  '/demo/components/link-preview': '链接预览',
  '/demo/components/shiny-text': '流光文字',
  '/demo/components/marquee': '跑马灯',
  '/demo/components/icon-picker': '图标选择器',
  '/demo/components/markdown': 'Markdown预览',
  '/demo/components/rich-text-editor': '富文本编辑器',
  '/demo/components/pattern-bg': '图案背景',
  '/demo/components/iframe': 'iframe',
  '/demo/components/signature-pad': '签名板',
  '/demo/func': '功能',
  '/demo/func/maximize-page': '页面最大化',
  '/demo/func/logout': '登陆过期',
  '/demo/func/fireworks': '庆祝效果',
  '/demo/link': '外链',
  '/demo/link/me': '个人主页',
  '/demo/link/react': 'React',
  '/demo/link/vite': 'Vite',
  '/demo/breadcrumb': '面包屑导航',
  '/demo/breadcrumb/flat': '平级导航',
  '/demo/breadcrumb/nested': '层级导航',
  '/demo/center-layout': '居中布局',
  '/demo/center-layout/layout-in': '内层居中',
  '/demo/center-layout/layout-out': '外层居中',
  '/demo/route-params': '带参导航',
  '/demo/keepalive': '页面保活',
  '/demo/menu-active': '导航图标激活',
  '/demo/menu-active/menu-active-children': '子级图标激活',
  '/demo/menu-active/menu-active-parent': '父级图标激活',
  '/demo/menu-active/menu-active-parent/menu-active-parent-test': '测试页面',
  '/demo/dashboard': '大屏',
  '/demo/dashboard/dashboard1': '大屏演示1',
  '/demo/dashboard/dashboard2': '大屏演示2',
  '/demo/dashboard/dashboard3': '大屏演示3',
  '/system': '通用',
  '/system/admin': '用户管理',
  '/system/role': '角色管理',
  '/system/menu': '导航管理',
  '/ui': 'UI',
}

// ==================== components 包文案（主组件 + demo） ====================
const componentMessages = {
  // ---- 签名板 ----
  'component.signaturePad.signRequired': '请先完成签名',
  'component.signaturePad.placeholder': '请在此处签名',

  // ---- 富文本编辑器 ----
  'component.richTextEditor.placeholder': '请输入内容...',
  'component.richTextEditor.toolbar.bold': '加粗',
  'component.richTextEditor.toolbar.italic': '斜体',
  'component.richTextEditor.toolbar.underline': '下划线',
  'component.richTextEditor.toolbar.strike': '删除线',
  'component.richTextEditor.toolbar.blockquote': '引用',
  'component.richTextEditor.toolbar.codeBlock': '代码块',
  'component.richTextEditor.toolbar.link': '插入链接',
  'component.richTextEditor.toolbar.image': '插入图片',
  'component.richTextEditor.toolbar.video': '插入视频',
  'component.richTextEditor.toolbar.clean': '清除格式',
  'component.richTextEditor.toolbar.header': '标题',
  'component.richTextEditor.toolbar.list': '列表',
  'component.richTextEditor.toolbar.align': '对齐方式',
  'component.richTextEditor.toolbar.color': '文字颜色',
  'component.richTextEditor.toolbar.background': '背景颜色',
  'component.richTextEditor.toolbar.direction': '文字方向',
  'component.richTextEditor.toolbar.indent': '缩进',
  'component.richTextEditor.toolbar.script': '上下标',
  'component.richTextEditor.toolbar.font': '字体',
  'component.richTextEditor.toolbar.size': '字号',

  // ---- 滑块验证 ----
  'component.sliderCaptcha.tip.default': '请按住滑块，拖动到最右边',
  'component.sliderCaptcha.tip.moving': '请按住滑块，拖动到最右边',
  'component.sliderCaptcha.tip.error': '验证失败，请重新操作',
  'component.sliderCaptcha.tip.success': '验证成功',
  'component.sliderCaptcha.verifyFailed': '验证失败',

  // ---- 图标选择器 ----
  'component.iconPicker.placeholder': '请选择图标',
  'component.iconPicker.searchPlaceholder': '搜索图标',
  'component.iconPicker.icons': '个图标',

  // ---- demo 通用 ----
  'component.demo.common.textContent': '文本内容',
  'component.demo.common.fontSize': '字体大小 (px)',
  'component.demo.common.animationSpeed': '动画速度',
  'component.demo.common.speedFast': '快速',
  'component.demo.common.speedMedium': '中等',
  'component.demo.common.speedSlow': '慢速',
  'component.demo.common.width': '宽度 (px)',
  'component.demo.common.height': '高度 (px)',
  'component.demo.common.placeholderLabel': '占位提示',

  // ---- 流光文字 demo ----
  'component.demo.shinyText.title': '流光文字',
  'component.demo.shinyText.defaultText': 'Zealous-admin是一套好用的后台管理系统模板',
  'component.demo.shinyText.textColor': '文本颜色',
  'component.demo.shinyText.shinyColor': '流光颜色',

  // ---- 闪烁文字 demo ----
  'component.demo.sparklesText.title': '闪烁文字',
  'component.demo.sparklesText.defaultText': 'Zealous-admin是一套好用的后台管理系统模板',
  'component.demo.sparklesText.shapeType': '形状类型',
  'component.demo.sparklesText.shape.fourPointStar': '四角星',
  'component.demo.sparklesText.shape.star': '五角星',
  'component.demo.sparklesText.shape.flower': '花朵',

  // ---- 滑块验证 demo ----
  'component.demo.sliderCaptcha.title': '滑块验证',
  'component.demo.sliderCaptcha.type': '验证类型',
  'component.demo.sliderCaptcha.type.slider': '纯滑块验证',
  'component.demo.sliderCaptcha.type.embed': '拼图验证',
  'component.demo.sliderCaptcha.type.float': '触发式拼图验证',
  'component.demo.sliderCaptcha.bgWidth': '背景宽度 (px)',
  'component.demo.sliderCaptcha.bgHeight': '背景高度 (px)',
  'component.demo.sliderCaptcha.defaultTip': '默认提示',
  'component.demo.sliderCaptcha.successTip': '成功提示',
  'component.demo.sliderCaptcha.errorTip': '失败提示',
  'component.demo.sliderCaptcha.defaultTipText': '请按住滑块，拖动到最右边',
  'component.demo.sliderCaptcha.successTipText': '验证成功',
  'component.demo.sliderCaptcha.errorTipText': '验证失败，请重新操作',
  'component.demo.sliderCaptcha.verifySuccess': '{type}验证成功',
  'component.demo.sliderCaptcha.verifyError': '{type}验证失败，请重试',

  // ---- 签名板 demo ----
  'component.demo.signaturePad.title': '签名板',
  'component.demo.signaturePad.generated': '签名图片已生成',
  'component.demo.signaturePad.penWidth': '画笔粗细 (px)',
  'component.demo.signaturePad.penColor': '画笔颜色',
  'component.demo.signaturePad.bgColor': '背景颜色',
  'component.demo.signaturePad.reSign': '重签',
  'component.demo.signaturePad.generate': '生成图片',
  'component.demo.signaturePad.download': '下载图片',
  'component.demo.signaturePad.previewTitle': '签名预览',
  'component.demo.signaturePad.close': '关闭',

  // ---- 跑马灯 demo ----
  'component.demo.marquee.title': '跑马灯',
  'component.demo.marquee.direction.horizontal': '横向',
  'component.demo.marquee.direction.vertical': '竖向',
  'component.demo.marquee.duration': '动画时长 (秒)',
  'component.demo.marquee.gap': '子项间距 (px)',
  'component.demo.marquee.repeat': '重复次数',
  'component.demo.marquee.direction': '滚动方向',
  'component.demo.marquee.reverse': '反向滚动',
  'component.demo.marquee.pauseOnHover': '悬停暂停',
  'component.demo.marquee.gradient': '渐变蒙层',
  'component.demo.marquee.specialDemo': '特殊示例',
  'component.demo.marquee.review1': '这套组件库的设计风格非常现代化，API 设计清晰易懂，文档也很详细，上手非常快。团队使用下来整体体验很棒，大大提升了开发效率，推荐给所有前端开发者使用。',
  'component.demo.marquee.review2': '组件质量很高，性能优化做得很好，在复杂场景下依然保持流畅的用户体验。特别是表格组件和表单组件，功能强大且易于定制，非常适合企业级应用开发。',
  'component.demo.marquee.review3': '非常喜欢这个组件库的设计系统，主题定制能力很强，很容易适配我们的产品风格。暗色模式和亮色模式切换流畅，动画效果精致，用户体验非常好。',
  'component.demo.marquee.review4': '团队协作效率提升很多，组件复用性强，大大减少了重复开发的工作量。代码结构清晰，易于维护，新成员能够快速上手，是一个非常成熟的组件库。',
  'component.demo.marquee.review5': '技术支持响应及时，社区活跃，遇到问题能很快找到解决方案。更新频率稳定，bug修复及时，是一个值得信赖的开源项目。',
  'component.demo.marquee.review6': 'TypeScript 类型定义非常完善，开发体验很好，减少了很多类型错误。智能提示准确，类型安全有保障，强烈推荐 TypeScript 项目使用。',
  'component.demo.marquee.review7': '移动端适配做得很棒，响应式设计让我们的应用在各种设备上都有很好的表现。无论是手机、平板还是桌面端，都能提供一致的用户体验。',
  'component.demo.marquee.review8': '组件的可访问性做得很好，符合 WCAG 标准，对我们的无障碍需求支持很到位。键盘导航、屏幕阅读器支持都很完善，是一个负责任的组件库。',

  // ---- 图案背景 demo ----
  'component.demo.patternBg.title': '图案背景',
  'component.demo.patternBg.patternType': '图案类型',
  'component.demo.patternBg.pattern.grid': '网格',
  'component.demo.patternBg.pattern.dot': '圆点',
  'component.demo.patternBg.size': '图案尺寸 (px)',
  'component.demo.patternBg.opacity': '透明度',
  'component.demo.patternBg.animationDirection': '动画方向',
  'component.demo.patternBg.animation.up': '向上',
  'component.demo.patternBg.animation.down': '向下',
  'component.demo.patternBg.animation.left': '向左',
  'component.demo.patternBg.animation.right': '向右',
  'component.demo.patternBg.animation.none': '无',
  'component.demo.patternBg.maskDirection': '遮罩方向',
  'component.demo.patternBg.mask.all': '全部',
  'component.demo.patternBg.mask.top': '顶部',
  'component.demo.patternBg.mask.bottom': '底部',
  'component.demo.patternBg.mask.left': '左侧',
  'component.demo.patternBg.mask.right': '右侧',
  'component.demo.patternBg.mask.topBottom': '上下',
  'component.demo.patternBg.mask.leftRight': '左右',
  'component.demo.patternBg.mask.none': '无',

  // ---- 富文本编辑器 demo ----
  'component.demo.richTextEditor.title': '富文本编辑器',
  'component.demo.richTextEditor.toolbar': '工具栏',
  'component.demo.richTextEditor.toolbarMode.full': '完整工具栏',
  'component.demo.richTextEditor.toolbarMode.simple': '简约工具栏',
  'component.demo.richTextEditor.toolbarMode.none': '隐藏工具栏',
  'component.demo.richTextEditor.height': '编辑区高度',
  'component.demo.richTextEditor.height.auto': '自动填满父容器',
  'component.demo.richTextEditor.readOnly': '只读模式',
  'component.demo.richTextEditor.htmlSource': 'HTML 源码',
  'component.demo.richTextEditor.renderEffect': '渲染效果',
  'component.demo.richTextEditor.initialContent': `<h2>欢迎使用富文本编辑器</h2>
<p>基于 <strong>Quill</strong> 的轻量级编辑器，样式已接入 <strong>antd 主题变量</strong>，可随主题自动适配<em>明暗模式</em>。</p>
<p>支持<strong>加粗</strong>、<em>斜体</em>、<u>下划线</u>、<s>删除线</s> 等常用格式。</p>
<h3>列表与对齐</h3>
<ul>
  <li>无序列表第一项</li>
  <li>无序列表第二项</li>
</ul>
<ol>
  <li>有序列表第一项</li>
  <li>有序列表第二项</li>
</ol>
<p style="text-align: center">这段文字居中显示。</p>
<blockquote>好的工具应该让复杂的事情变简单。</blockquote>
<pre class="ql-syntax" spellcheck="false">import Quill from 'quill'

const editor = new Quill('#editor', { theme: 'snow' })</pre>
<p>可以插入 <a href="https://quilljs.com" target="_blank">链接</a> 与图片。试试编辑上方内容，观察下方输出如何实时变化。</p>`,

  // ---- 图标选择器 demo ----
  'component.demo.iconPicker.title': '图标选择器',
  'component.demo.iconPicker.library': '图标库',
  'component.demo.iconPicker.libraryPlaceholder': '请选择图标库',
  'component.demo.iconPicker.clearable': '可清除',
  'component.demo.iconPicker.selectIcon': '选择图标',
  'component.demo.iconPicker.selectedValue': '选中值:',

  // ---- 链接预览 demo ----
  'component.demo.linkPreview.title': '链接预览',
  'component.demo.linkPreview.url': '链接地址',
  'component.demo.linkPreview.urlPlaceholder': '请输入网址',
  'component.demo.linkPreview.hoverPreview': '悬停查看预览:',
  'component.demo.linkPreview.moreExamples': '更多示例',

  // ---- 外链嵌入 demo ----
  'component.demo.iframe.title': '外链嵌入',
  'component.demo.iframe.site.home': '个人主页',

  // ---- Markdown demo ----
  'component.demo.markdown.title': 'Markdown',
  'component.demo.markdown.chars': '字符',
  'component.demo.markdown.placeholder': '在此输入 Markdown 内容...',
  'component.demo.markdown.preview': '预览',
  'component.demo.markdown.sample': `# 欢迎使用 Markdown 编辑器

## 文本样式

这是一段普通文本，其中包含 **加粗**、*斜体*、~~删除线~~、\`行内代码\` 和 [超链接](https://github.com)。

## 代码块

\`\`\`typescript
interface User {
  id: number
  name: string
  email: string
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`
}
\`\`\`

## 表格

| 特性 | 支持情况 | 备注 |
|------|---------|------|
| GFM | ✅ | 完整支持 |
| 代码高亮 | ✅ | Prism |
| 任务列表 | ✅ | GFM 扩展 |

## 引用

> 这是引用块
> 可以跨多行

## 列表

1. 有序列表项一
2. 有序列表项二
   - 嵌套无序列表
   - 嵌套无序列表

- [x] 完成任务
- [ ] 未完成任务`,
}

// 合并后的完整文案（layout 内置 + 应用侧 + components 包）
const zhCN = { ...layoutMessages, ...menuMessages, ...componentMessages }

export default zhCN
export type LayoutMessages = typeof layoutMessages
