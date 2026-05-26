<template>
    <el-container class="tutorials-page">
        <el-header class="tutorials-header">
            <div class="header-inner">
                <RouterLink class="back-link" to="/">
                    <span aria-hidden="true">←</span>
                    返回仪表盘
                </RouterLink>
                <h1>TJUEcard 通知教程</h1>
            </div>
        </el-header>

        <el-main class="tutorials-main">
            <nav class="tutorial-nav" aria-label="教程目录">
                <a
                    v-for="section in tutorialSections"
                    :key="section.id"
                    :class="{ active: activeSection === section.id }"
                    :href="`#${section.id}`"
                    @click="activeSection = section.id"
                >
                    {{ section.label }}
                </a>
            </nav>

            <article id="dingtalk-webhook" class="tutorial-section">
                <h2>如何获取钉钉机器人的 webhook 链接？</h2>
                <p>
                    TJUEcard
                    支持通过钉钉“群自定义机器人”发送通知。你需要先创建一个钉钉群，然后在群里添加自定义机器人，最后把机器人生成的
                    Webhook 链接粘贴到 TJUEcard 的“通知设置”里。
                </p>

                <h3>前置条件</h3>
                <ul>
                    <li>由于钉钉限制：添加自定义群机器人需要使用钉钉电脑版。</li>
                    <li>由于钉钉限制：电脑版无法创建单人群，需要先在手机端创建群聊（可以只选 1 个联系人建群）。</li>
                </ul>
                <p>
                    钉钉电脑版下载地址：<a
                        href="https://www.dingtalk.com/download"
                        target="_blank"
                        rel="noopener noreferrer"
                        >https://www.dingtalk.com/download</a
                    >
                </p>

                <h3>1. 手机钉钉创建群聊（单人群）</h3>
                <ol>
                    <li>打开手机钉钉，进入“消息”页面。</li>
                    <li>右上角 <code>+</code>，点击“发起群聊”。</li>
                    <li>点击“选择联系人建群”。</li>
                    <li>在下方点击“修改群聊”。</li>
                    <li>将“群归属”选择为 <code>我的 - 普通群</code>，然后确定。</li>
                    <li>联系人不用改：默认已选择 1 人即可。</li>
                    <li>点击“发起群聊(1/999)”创建群。</li>
                </ol>
                <p>说明：钉钉的“群机器人”必须依附在群里，所以需要先有一个群。</p>

                <h3>2. 电脑钉钉添加自定义机器人并获取 Webhook</h3>
                <ol>
                    <li>打开钉钉电脑版，进入你刚创建的群聊。</li>
                    <li>点击右上角“设置”（群设置）。</li>
                    <li>点击“机器人”。</li>
                    <li>点击“添加机器人”。</li>
                    <li>选择“自定义”，点击“添加”。</li>
                    <li>机器人名字建议填：<code>TJUEcard</code>（或任意你喜欢的名称）。</li>
                    <li>“安全设置”只勾选“自定义关键词”，关键词填入：</li>
                </ol>
                <pre><code>TJUEcard</code></pre>
                <ol start="8">
                    <li>点击“完成”，钉钉会展示一个 Webhook 链接（通常带 <code>access_token=...</code>），复制它。</li>
                </ol>
                <p>注意：Webhook 相当于“发送权限”，不要泄露给他人。</p>

                <h3>3. 在 TJUEcard 网页中配置并验证</h3>
                <ol>
                    <li>打开 TJUEcard 仪表盘页面。</li>
                    <li>右上角点击“通知设置”。</li>
                    <li>将复制的 Webhook 粘贴到 <code>Webhook URL</code> 输入框。</li>
                    <li>打开“钉钉通知”开关。</li>
                    <li>点击“保存”。</li>
                </ol>
                <p>保存并开启后，系统会立即向该群发送一条“开启通知”，用来验证 Webhook 是否可用。</p>

                <h3>常见问题</h3>
                <h4>1) 我设置了关键词，为什么收不到消息？</h4>
                <ul>
                    <li>确认机器人“安全设置”里勾选的是“自定义关键词”，并且关键词包含 <code>TJUEcard</code>。</li>
                    <li>确认 TJUEcard 的钉钉通知消息内容包含 <code>TJUEcard</code>（本项目默认包含）。</li>
                </ul>
            </article>

            <article id="wechat-email" class="tutorial-section">
                <h2>如何配置微信通知？方法1：转发 QQ 邮箱通知</h2>
                <p>
                    TJUEcard 目前支持邮件通知。如果你希望在微信上收到提醒，一个常见做法是把
                    <code>@tju.edu.cn</code> 邮箱的来信自动转发到 QQ 邮箱，并在微信里开启“QQ 邮箱提醒”。
                </p>
                <p>下面是一个可行的配置流程。</p>

                <h3>1. 开启天津大学邮箱自动转发到 QQ 邮箱</h3>
                <ol>
                    <li>
                        打开并登录天津大学邮箱：<a
                            href="https://mail.tju.edu.cn"
                            target="_blank"
                            rel="noopener noreferrer"
                            >https://mail.tju.edu.cn</a
                        >
                    </li>
                    <li>点击“设置” -&gt; “邮箱设置”。</li>
                    <li>在“常规设置”里找到“自动回复/转发”。</li>
                    <li>在“自动转发”里点击“点击设置”。</li>
                    <li>勾选/点击“开启自动转发”。</li>
                    <li>输入你的 QQ 邮箱地址（例如：<code>xxxxxx@qq.com</code>）。</li>
                    <li>点击“保存设置”。</li>
                </ol>
                <p>说明：开启后，发送到 <code>@tju.edu.cn</code> 的通知邮件会自动转发到 QQ 邮箱。</p>

                <h3>2. 在微信里开启“QQ 邮箱提醒”</h3>
                <ol>
                    <li>打开微信，进入“我” -&gt; “设置”。</li>
                    <li>进入“通用” -&gt; “辅助功能”。</li>
                    <li>找到并进入“QQ邮箱提醒”。</li>
                    <li>如果未开启：先开启该功能。</li>
                    <li>登录你的 QQ 邮箱账号。</li>
                    <li>确保在设置页开启“接受邮件提醒”。</li>
                </ol>
                <p>完成后，QQ 邮箱收到的新邮件会通过微信“QQ邮箱提醒”推送给你，从而实现接近“微信通知”的效果。</p>

                <h3>常见问题</h3>
                <h4>1) 转发开启了但微信没提醒？</h4>
                <ul>
                    <li>
                        确保天津大学邮箱已正确开启自动转发，并且最新邮件确实被转发到你的 QQ
                        邮箱（先排查转发链路是否通）。
                    </li>
                    <li>确认 QQ 邮箱本身收到了转发邮件（可先在电脑端网页邮箱或 QQ 邮箱 App 里检查）。</li>
                    <li>确认微信的“QQ邮箱提醒”已登录正确的 QQ 邮箱账号。</li>
                    <li>确认“QQ邮箱提醒”里已开启“接受邮件提醒”。</li>
                </ul>
            </article>

            <article id="wechat-test-account" class="tutorial-section">
                <h2>如何配置微信通知？方法2：微信测试号通知</h2>
                <blockquote>
                    <p>目标：把微信测试号与 TJUEcard 绑定，实现模板消息通知发送。</p>
                    <p>建议：<strong>电脑端操作</strong>（微信扫码登录更顺畅，页面字段也更完整）。</p>
                    <p>大致用时 5 分钟。</p>
                </blockquote>

                <h3>前置条件</h3>
                <ul>
                    <li>你需要有一个微信号，用来登录微信测试号后台</li>
                    <li>
                        你可以访问下面两个页面：
                        <ul>
                            <li>
                                微信测试号管理页：<a
                                    href="https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    >https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login</a
                                >
                            </li>
                            <li>
                                TJUEcard 控制台：<a
                                    href="https://tjuecard.ibuhub.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    >https://tjuecard.ibuhub.com</a
                                >
                            </li>
                        </ul>
                    </li>
                </ul>

                <h3>1. 登录微信测试号后台，拿到 appID / appsecret</h3>
                <ol>
                    <li>
                        打开：<a
                            href="https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login"
                            target="_blank"
                            rel="noopener noreferrer"
                            >https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login</a
                        >
                    </li>
                    <li>用微信扫码登录</li>
                    <li>
                        在“测试号信息”区域复制：
                        <ul>
                            <li><code>appID</code></li>
                            <li><code>appsecret</code></li>
                        </ul>
                    </li>
                </ol>
                <blockquote>
                    <p>
                        <strong>注意：</strong><code>appsecret</code> 是敏感信息，只用于服务端换取
                        <code>access_token</code>，不要泄露。
                    </p>
                </blockquote>
                <details>
                    <summary>📷 截图（点击展开）：测试号信息（appID / appsecret）</summary>
                    <p class="image-wrap">
                        <img
                            width="1839"
                            height="229"
                            alt="Image"
                            src="/tutorial-images/wechat-test-account-appid-secret.png"
                        />
                    </p>
                </details>

                <h3>2. 在 TJUEcard 控制台开启“微信通知”并填写 app 信息</h3>
                <ol>
                    <li>
                        打开 TJUEcard 控制台：<a
                            href="https://tjuecard.ibuhub.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            >https://tjuecard.ibuhub.com</a
                        >
                    </li>
                    <li>右上角点击 <strong>设置</strong></li>
                    <li>找到 <strong>微信测试号通知</strong> 区域，打开微信通知开关</li>
                    <li>
                        填入：
                        <ul>
                            <li><strong>appID</strong>：粘贴你在测试号后台复制的 <code>appID</code></li>
                            <li><strong>appsecret</strong>：粘贴你在测试号后台复制的 <code>appsecret</code></li>
                        </ul>
                    </li>
                </ol>
                <details>
                    <summary>📷 截图（点击展开）：控制台填写测试号信息（appID / appsecret）</summary>
                    <p class="image-wrap">
                        <img width="500" alt="Image" src="/tutorial-images/wechat-settings-app-info.png" />
                    </p>
                </details>

                <h3>3. 配置“模板消息接口”：新增测试模板并拿到模板 ID</h3>
                <ol>
                    <li>在微信测试号后台找到 <strong>模板消息接口</strong></li>
                    <li>点击 <strong>新增测试模板</strong></li>
                    <li>
                        回到 TJUEcard 的微信测试号通知设置，找到“模板内容”区域：
                        <ul>
                            <li>点击 <strong>复制模板标题</strong></li>
                            <li>点击 <strong>复制模板内容</strong></li>
                        </ul>
                    </li>
                    <li>
                        回到微信测试号后台“新增测试模板”页面：
                        <ul>
                            <li><strong>模板标题</strong>：粘贴“复制模板标题”的内容</li>
                            <li><strong>模板内容</strong>：粘贴“复制模板内容”的内容</li>
                        </ul>
                    </li>
                    <li>点击 <strong>提交</strong></li>
                    <li>
                        提交后会生成 <strong>模板ID</strong>：请在模板列表里把 <strong>模板ID（完整）复制出来</strong>
                    </li>
                    <li>回到 TJUEcard 的微信测试号通知设置，把模板ID粘贴到 <strong>模板ID</strong> 输入框</li>
                    <li>点击底部 <strong>保存</strong>，看到类似 <strong>“已保存通知设置”</strong> 的提示即成功</li>
                </ol>
                <details>
                    <summary>📷 截图（点击展开）：模板消息配置全过程</summary>
                    <p>(1) TJUEcard 模板内容复制入口</p>
                    <p class="image-wrap">
                        <img src="/tutorial-images/wechat-template-copy-entry.png" width="500" alt="模板内容入口" />
                    </p>
                    <p>(2) 新增测试模板页面</p>
                    <p class="image-wrap">
                        <img src="/tutorial-images/wechat-template-create-page.png" width="500" alt="新增测试模板" />
                    </p>
                    <p>(3) 模板列表里的模板 ID</p>
                    <p class="image-wrap">
                        <img src="/tutorial-images/wechat-template-id-list.png" width="900" alt="模板ID" />
                    </p>
                    <p>(4) 把模板 ID 回填并保存</p>
                    <p class="image-wrap">
                        <img src="/tutorial-images/wechat-template-id-fill-save.png" width="500" alt="回填模板ID" />
                    </p>
                </details>

                <h3>4. 关注测试号（让系统自动识别 OpenID）</h3>
                <ol>
                    <li>在微信测试号后台找到 <strong>测试号二维码</strong></li>
                    <li>用微信扫码并关注该测试号</li>
                    <li>回到 TJUEcard 的微信测试号通知设置页底部的 <strong>已订阅用户</strong></li>
                    <li>正常情况下会出现你的 OpenID</li>
                </ol>
                <blockquote>
                    <p>如果没有立即出现，可以重新打开一次设置页再看。</p>
                </blockquote>
                <details>
                    <summary>📷 截图（点击展开）：关注测试号后，已订阅用户中出现 OpenID</summary>
                    <p>(1) 微信测试号后台的用户列表</p>
                    <p class="image-wrap">
                        <img
                            width="1853"
                            height="508"
                            alt="Image"
                            src="/tutorial-images/wechat-test-account-user-list.png"
                        />
                    </p>
                    <p>(2)TJUEcard 的微信测试号通知设置的已订阅用户</p>
                    <p class="image-wrap">
                        <img
                            width="482"
                            height="115"
                            alt="Image"
                            src="/tutorial-images/wechat-subscribed-users-and-test-button.png"
                        />
                    </p>
                </details>

                <h3>5. 发送测试通知</h3>
                <ol>
                    <li>在 TJUEcard 的微信测试号通知设置页底部</li>
                    <li>点击 <strong>测试通知</strong></li>
                    <li>系统会给 <strong>所有已关注用户</strong> 发送一条测试模板消息</li>
                </ol>
                <details>
                    <summary>📷 截图（点击展开）：发送测试通知入口</summary>
                    <p class="image-wrap">
                        <img
                            width="482"
                            height="115"
                            alt="Image"
                            src="/tutorial-images/wechat-subscribed-users-and-test-button.png"
                        />
                    </p>
                </details>

                <h3>6. 关闭 / 解绑</h3>
                <ul>
                    <li><strong>仅关闭通知</strong>：关闭“微信通知”开关即可（不影响测试号后台配置）</li>
                    <li><strong>解绑测试号</strong>：点击 <strong>解绑测试号</strong>（会彻底清理绑定关系/配置）</li>
                </ul>

                <h3>7. 如何查看历史通知</h3>
                <p>在微信里查看通知历史：</p>
                <ol>
                    <li>打开微信</li>
                    <li>进入公众号会话</li>
                    <li>右上角 <strong>我的</strong></li>
                    <li>点击 <strong>通知</strong></li>
                    <li>顶部切换到 <strong>私信</strong>，即可看到历史通知</li>
                </ol>

                <hr />

                <h3>常见易错点</h3>
                <ol>
                    <li><code>appsecret</code> 不要填错，填错会导致 access_token 获取失败。</li>
                    <li><strong>模板 ID 要复制完整</strong>：不要漏字符，不要只复制一部分。</li>
                </ol>
            </article>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

const tutorialSections = [
    { id: 'dingtalk-webhook', label: '钉钉群机器人' },
    { id: 'wechat-email', label: '微信通知方法1' },
    { id: 'wechat-test-account', label: '微信通知方法2' },
];

const activeSection = ref(tutorialSections[0].id);
let observer: IntersectionObserver | null = null;

const updateActiveSectionFromHash = () => {
    const hashSection = tutorialSections.find(section => `#${section.id}` === window.location.hash);
    if (!hashSection) return false;

    activeSection.value = hashSection.id;
    return true;
};

const updateActiveSection = () => {
    const scrollOffset = 140;
    let current = tutorialSections[0].id;

    for (const section of tutorialSections) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= scrollOffset) {
            current = section.id;
        }
    }

    activeSection.value = current;
};

onMounted(() => {
    nextTick(() => {
        updateActiveSectionFromHash();

        observer = new IntersectionObserver(updateActiveSection, {
            rootMargin: '-120px 0px -65% 0px',
            threshold: 0,
        });

        tutorialSections.forEach(section => {
            const element = document.getElementById(section.id);
            if (element) observer?.observe(element);
        });

        window.addEventListener('scroll', updateActiveSection, { passive: true });
        window.addEventListener('hashchange', updateActiveSectionFromHash);
        if (!updateActiveSectionFromHash()) updateActiveSection();
    });
});

onBeforeUnmount(() => {
    observer?.disconnect();
    window.removeEventListener('scroll', updateActiveSection);
    window.removeEventListener('hashchange', updateActiveSectionFromHash);
});
</script>

<style scoped>
.tutorials-page {
    min-height: 100vh;
    background: var(--app-bg);
    color: var(--el-text-color-primary);
}

.tutorials-header {
    height: auto;
    padding: 0;
    background: var(--header-bg);
    border-bottom: var(--header-border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-inner {
    width: min(960px, calc(100% - 32px));
    margin: 0 auto;
    padding: 22px 0 26px;
}

.back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.9);
    text-decoration: none;
    font-size: 14px;
    margin-bottom: 12px;
}

.back-link:hover {
    color: #fff;
}

.header-inner h1 {
    color: #fff;
    font-size: 30px;
    line-height: 1.2;
    margin: 0 0 8px;
    font-weight: 700;
}

.header-inner p {
    color: rgba(255, 255, 255, 0.86);
    margin: 0;
    font-size: 15px;
}

.tutorials-main {
    width: min(960px, calc(100% - 32px));
    margin: 0 auto;
    padding: 22px 0 56px;
    overflow: visible;
}

.tutorial-nav {
    position: sticky;
    top: 12px;
    z-index: 20;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    padding: 10px;
    margin: 0 -10px 16px;
    background: rgba(245, 247, 250, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.68);
    border-radius: 22px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
    backdrop-filter: blur(14px);
}

html.dark .tutorial-nav {
    background: rgba(17, 24, 39, 0.82);
    border-color: rgba(255, 255, 255, 0.1);
}

.tutorial-nav a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 16px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
    color: var(--el-text-color-regular);
    text-decoration: none;
    box-shadow: var(--el-box-shadow-lighter);
    font-size: 13px;
}

.tutorial-nav a:hover {
    color: #667eea;
    border-color: #667eea;
}

.tutorial-nav a.active {
    color: #fff;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: transparent;
    box-shadow: 0 8px 18px rgba(102, 126, 234, 0.28);
}

.tutorial-section {
    scroll-margin-top: 96px;
    padding: 28px 34px 32px;
    margin-bottom: 22px;
    background: var(--card-bg);
    border: var(--card-border);
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    line-height: 1.75;
}

.tutorial-section h2 {
    margin: 0 0 18px;
    font-size: 26px;
    line-height: 1.3;
}

.tutorial-section h3 {
    margin: 30px 0 12px;
    font-size: 20px;
    line-height: 1.35;
}

.tutorial-section h4 {
    margin: 18px 0 8px;
    font-size: 16px;
}

.tutorial-section p {
    margin: 10px 0;
}

.tutorial-section a {
    color: #667eea;
    text-decoration: none;
    overflow-wrap: anywhere;
}

.tutorial-section a:hover {
    text-decoration: underline;
}

.tutorial-section ul,
.tutorial-section ol {
    padding-left: 1.35em;
    margin: 10px 0;
}

.tutorial-section li {
    margin: 5px 0;
}

.tutorial-section code {
    padding: 2px 5px;
    border-radius: 4px;
    background: var(--el-fill-color-light);
    color: var(--el-color-danger);
    font-family: Consolas, Monaco, 'Courier New', monospace;
    font-size: 0.92em;
}

.tutorial-section pre {
    margin: 12px 0;
    padding: 14px 16px;
    overflow-x: auto;
    border-radius: 8px;
    background: var(--el-fill-color-dark);
}

.tutorial-section pre code {
    padding: 0;
    background: transparent;
    color: var(--el-text-color-primary);
}

.tutorial-section blockquote {
    margin: 16px 0;
    padding: 10px 16px;
    border-left: 4px solid #667eea;
    background: var(--el-fill-color-lighter);
    border-radius: 0 8px 8px 0;
    color: var(--el-text-color-regular);
}

.tutorial-section blockquote p {
    margin: 4px 0;
}

.tutorial-section details {
    margin: 14px 0;
    padding: 12px 14px;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    background: var(--el-bg-color);
}

.tutorial-section summary {
    cursor: pointer;
    color: var(--el-text-color-regular);
    font-weight: 600;
}

.image-wrap {
    text-align: center;
}

.image-wrap img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    border: 1px solid var(--el-border-color-lighter);
}

.tutorial-section hr {
    border: none;
    border-top: 1px solid var(--el-border-color-lighter);
    margin: 28px 0;
}

@media (max-width: 768px) {
    .header-inner {
        width: min(100% - 24px, 960px);
        padding: 18px 0 22px;
    }

    .header-inner h1 {
        font-size: 24px;
    }

    .tutorials-main {
        width: min(100% - 24px, 960px);
        padding-top: 14px;
    }

    .tutorial-nav {
        gap: 8px;
        top: 8px;
        padding: 8px;
        margin: 0 -8px 14px;
        border-radius: 18px;
    }

    .tutorial-nav a {
        flex: 0 1 auto;
    }

    .tutorial-section {
        padding: 22px 18px 26px;
    }

    .tutorial-section h2 {
        font-size: 22px;
    }

    .tutorial-section h3 {
        font-size: 18px;
    }
}
</style>
