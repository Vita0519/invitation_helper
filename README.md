# 企业微信文档邀请助手

一个用于企业微信文档的自动化邀请助手，可以批量邀请团队成员查看或编辑文档。

## 📋 功能特点

- 🚀 **批量邀请**：一键批量邀请多个团队成员
- 📝 **名单管理**：支持创建、保存、删除多个邀请名单
- 🔍 **智能搜索**：自动在通讯录中搜索并邀请指定人员
- 📊 **操作日志**：实时显示邀请进度和结果
- 🎯 **精准定位**：支持在企业微信文档页面和通讯录iframe中运行

## 🛠️ 安装要求

### 必需组件

- **浏览器**：Chrome、Firefox、Edge、Safari 等现代浏览器
- **篡改猴（Tampermonkey）**：必须安装此浏览器扩展才能使用本脚本

#### 篡改猴安装方法

1. **Chrome浏览器**：
   - 访问 [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - 点击"添加到Chrome"按钮安装

2. **Firefox浏览器**：
   - 访问 [Firefox Browser ADD-ONS](https://addons.mozilla.org/firefox/addon/tampermonkey/)
   - 点击"添加到Firefox"按钮安装

3. **Edge浏览器**：
   - 访问 [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
   - 点击"获取"按钮安装

## 📦 安装脚本

1. 确保已安装篡改猴扩展
2. 复制本仓库中的 `invitation_helper.user5.0 copy.js` 文件内容
3. 点击浏览器工具栏中的篡改猴图标
4. 选择"仪表板"
5. 点击"新建脚本"
6. 将复制的代码粘贴到编辑器中
7. 点击"文件" → "保存"

## 🎯 使用方法

### 基本使用

1. 打开企业微信文档页面（`https://doc.weixin.qq.com/*`）
2. 页面右侧会自动显示"文档邀请助手"面板
3. 从下拉菜单中选择要使用的邀请名单
4. 点击"🚀 开始邀请"按钮
5. 脚本将自动执行邀请流程

### 名单管理

#### 默认名单
脚本内置了"默认周报名单"，用于致谢有过帮助的互联网大佬，排名不分先后。包括但不限于：
- xxx
- 八戒
- 酱爆
- Garson
- BEelzebub
- 飞天雾
- 回忆
- 煎饼果子（86）

#### 创建新名单
1. 点击"新建"按钮
2. 输入名单名称
3. 输入成员名单（用逗号、分号或换行分隔）
4. 点击"保存"

#### 保存当前名单
1. 在文本框中编辑名单
2. 点击"保存"按钮

#### 删除名单
1. 选择要删除的名单
2. 点击"删除"按钮
3. 确认删除操作

### 面板控制

- **最小化**：点击"—"按钮最小化面板
- **关闭**：点击"X"按钮关闭面板
- **拖动**：拖动面板标题栏可以移动位置
- **显示/隐藏**：通过篡改猴菜单命令可以显示或隐藏面板

## ⚙️ 工作原理

### 支持的页面
- 腾讯文档主页面：`https://doc.weixin.qq.com/*`
- 企业微信通讯录iframe：`https://open.work.weixin.qq.com/wwopen/openData/tree/frame*`

### 执行流程
1. 点击文档页面上的邀请按钮
2. 等待通讯录面板加载
3. 逐个搜索名单中的成员
4. 自动点击搜索结果
5. 记录邀请结果

### 数据存储
- 所有邀请名单保存在浏览器的本地存储中
- 使用Tampermonkey的GM_setValue/GM_getValue API进行数据持久化

## 🔧 自定义配置

### 修改默认名单
如需修改默认名单，可以编辑脚本中的以下代码：
```javascript
const DEFAULT_PERSONS = ['xxx', '八戒', '酱爆', 'Garson', 'BEelzebub','飞天雾','回忆'];
```

### 修改分隔符
脚本支持多种分隔符，可以通过修改以下正则表达式来调整：
```javascript
const SPLIT_REGEX = /[,，；、\n\r]/;
```

## ⚠️ 注意事项

1. **网络要求**：确保网络连接稳定，避免因网络问题导致邀请失败
2. **页面状态**：邀请过程中请勿操作页面，等待流程完成
3. **权限要求**：确保有足够的权限邀请成员到文档
4. **兼容性**：建议使用最新版本的浏览器和Tampermonkey

## 🐛 故障排除

### 常见问题

**Q: 面板没有显示？**
A: 请检查：
- 是否已安装Tampermonkey
- 脚本是否已正确安装并启用
- 是否在支持的页面上（企业微信文档页面）
- 通过Tampermonkey菜单选择"显示/隐藏邀请助手"

**Q: 邀请失败？**
A: 可能原因：
- 网络连接问题
- 成员不存在于通讯录中
- 页面元素加载超时
- 权限不足

**Q: 名单丢失？**
A: 名单数据存储在浏览器本地，清除浏览器数据会导致丢失。建议定期备份重要名单。

## 📄 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系作者

- **作者**：victor0519
- **博客**：[https://www.allfather.top/](https://www.allfather.top/)
- **GitHub**：[https://github.com/Vita0519](https://github.com/Vita0519)

## 🙏 致谢

默认周报名单中的成员均为对互联网社区有贡献的大佬，排名不分先后，特此致谢！
