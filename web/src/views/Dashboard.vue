<template>
    <el-container class="layout-container">
        <el-header class="dashboard-header">
            <div style="display: flex; justify-content: space-between; align-items: center; height: 100%">
                <h3 class="header-title">TJUEcard 仪表盘</h3>
                <div class="header-right">
                    <el-button class="theme-toggle-btn" circle :icon="themeIcon" @click="toggleTheme" />
                    <el-button class="notify-settings-btn" circle :icon="Setting" @click="openNotifyDialog" />
                    <el-button class="logout-btn" circle :icon="LogoutDoorIcon" @click="confirmLogout" />
                </div>
            </div>
        </el-header>
        <el-main>
            <div class="actions">
                <el-button type="primary" class="add-room-btn" @click="showAddDialog = true">添加房间</el-button>
                <el-button :icon="Refresh" circle class="refresh-btn" :loading="loading" @click="fetchRooms" />
            </div>

            <el-table v-loading="loading" :data="rooms" class="rooms-table" stripe>
                <el-table-column prop="alias_name" label="名称">
                    <template #default="scope">
                        {{ spacingText(scope.row.alias_name) }}
                    </template>
                </el-table-column>
                <el-table-column label="状态">
                    <template #default="scope">
                        <el-tag :type="getStatusType(scope.row)">
                            {{ getStatusLabel(scope.row) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="下次更新">
                    <template #default="scope">
                        <span style="font-feature-settings: 'tnum'">{{
                            formatNextTime(scope.row.next_query_time)
                        }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="last_electricity" label="电量 (kWh)">
                    <template #default="scope">
                        {{ scope.row.last_electricity ?? '-' }}
                    </template>
                </el-table-column>
                <el-table-column prop="notification_threshold" label="阈值">
                    <template #default="scope">
                        {{ scope.row.notification_threshold === -1 ? '始终通知' : scope.row.notification_threshold }}
                    </template>
                </el-table-column>
                <el-table-column label="订阅状态">
                    <template #default="scope">
                        <el-switch
                            v-model="scope.row.is_active"
                            :active-value="1"
                            :inactive-value="0"
                            @change="toggleSubscription(scope.row)"
                        />
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="140">
                    <template #default="scope">
                        <el-button type="primary" size="small" @click="openEditDialog(scope.row)">修改</el-button>
                        <el-button type="danger" size="small" @click="deleteRoom(scope.row.id)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <!-- Add/Edit Room Dialog -->
            <el-dialog
                v-model="showAddDialog"
                :title="isEditMode ? '修改房间' : '添加房间'"
                width="600px"
                class="add-room-dialog"
                align-center
                @closed="resetForm"
            >
                <el-form label-width="100px" class="add-room-form">
                    <el-form-item label="系统">
                        <el-select
                            v-model="selectedSystemId"
                            placeholder="选择系统"
                            style="width: 100%"
                            @change="onSystemChange"
                        >
                            <el-option
                                v-for="item in systemOptions"
                                :key="item.id"
                                :label="spacingText(item.name)"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="区域">
                        <el-select
                            v-model="selectedAreaId"
                            placeholder="选择区域"
                            :disabled="!selectedSystemId"
                            style="width: 100%"
                            @change="onAreaChange"
                        >
                            <el-option
                                v-for="item in areaOptions"
                                :key="item.id"
                                :label="spacingText(item.name)"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="片区">
                        <el-select
                            v-model="selectedDistrictId"
                            placeholder="选择片区"
                            :disabled="!selectedAreaId"
                            style="width: 100%"
                            @change="onDistrictChange"
                        >
                            <el-option
                                v-for="item in districtOptions"
                                :key="item.id"
                                :label="spacingText(item.name)"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="楼栋">
                        <el-select
                            v-model="selectedBuildingId"
                            placeholder="选择楼栋"
                            :disabled="!selectedDistrictId"
                            style="width: 100%"
                            @change="onBuildingChange"
                        >
                            <el-option
                                v-for="item in buildingOptions"
                                :key="item.id"
                                :label="spacingText(item.name)"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="楼层">
                        <el-select
                            v-model="selectedFloorId"
                            placeholder="选择楼层"
                            :disabled="!selectedBuildingId"
                            style="width: 100%"
                            @change="onFloorChange"
                        >
                            <el-option
                                v-for="item in floorOptions"
                                :key="item.id"
                                :label="spacingText(item.name)"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="房间">
                        <el-select
                            v-model="selectedRoomId"
                            placeholder="选择房间"
                            :disabled="!selectedFloorId"
                            style="width: 100%"
                            @change="onRoomChange"
                        >
                            <el-option
                                v-for="item in roomOptions"
                                :key="item.id"
                                :label="spacingText(item.name)"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>

                    <el-divider />

                    <el-form-item label="别名">
                        <el-input
                            v-model="addForm.alias_name"
                            placeholder="例如：我的宿舍（默认为房间名称）"
                        ></el-input>
                    </el-form-item>
                    <el-form-item label="阈值">
                        <div class="threshold-field">
                            <el-input-number
                                v-model="addForm.notification_threshold"
                                :min="-1"
                                :step="1"
                            ></el-input-number>
                            <div class="threshold-hint">电量低于此值时发送邮件提醒。设置 -1 为始终发送。</div>
                        </div>
                    </el-form-item>
                </el-form>
                <template #footer>
                    <span class="dialog-footer">
                        <el-button @click="showAddDialog = false">取消</el-button>
                        <el-button
                            type="primary"
                            :loading="submitLoading"
                            :disabled="!selectedRoomId"
                            @click="submitAddRoom"
                            >确认</el-button
                        >
                    </span>
                </template>
            </el-dialog>

            <!-- Notification Settings Dialog -->
            <el-dialog
                v-model="showNotifyDialog"
                title="通知设置"
                width="min(560px, 92vw)"
                class="notify-settings-dialog"
                align-center
                @closed="notifyDialogClosed"
            >
                <div v-loading="notifyLoading">
                    <el-form class="notify-form" label-width="140px" label-position="left">
                        <el-form-item label="邮箱通知">
                            <div class="notify-field">
                                <div class="notify-switch-row">
                                    <el-switch
                                        v-model="notifyForm.notify_email_enabled"
                                        :active-value="1"
                                        :inactive-value="0"
                                        :disabled="notifyLoading || notifySaving || !notifyReady"
                                    />
                                </div>
                                <div class="form-hint">
                                    想在微信收到通知？可通过邮箱转发到 QQ 邮箱并在微信开启“QQ 邮箱提醒”：
                                    <a
                                        href="https://github.com/iBUHub/TJUEcard/issues/13"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        >查看教程</a
                                    >
                                </div>
                            </div>
                        </el-form-item>
                    </el-form>

                    <el-collapse v-model="notifyCollapseActive" class="notify-collapse">
                        <el-collapse-item title="钉钉群机器人" name="dingtalk">
                            <el-form class="notify-form" label-width="140px" label-position="left">
                                <el-form-item label="Webhook URL">
                                    <div class="notify-field">
                                        <el-input
                                            v-model="notifyForm.dingtalk_webhook_url"
                                            placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                                            clearable
                                            :disabled="notifyLoading || notifySaving || !notifyReady"
                                        />
                                        <div class="form-hint">
                                            填写钉钉群“机器人”提供的 webhook
                                            地址，保存并开启后会立即发送一条开启通知。如何获取 Webhook：
                                            <a
                                                href="https://github.com/iBUHub/TJUEcard/issues/12"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                >查看教程</a
                                            >
                                        </div>
                                    </div>
                                </el-form-item>

                                <el-form-item label="钉钉通知">
                                    <div class="notify-field">
                                        <div class="notify-switch-row">
                                            <el-switch
                                                v-model="notifyForm.notify_dingtalk_enabled"
                                                :active-value="1"
                                                :inactive-value="0"
                                                :disabled="
                                                    dingtalkSwitchDisabled ||
                                                    notifyLoading ||
                                                    notifySaving ||
                                                    !notifyReady
                                                "
                                            />
                                        </div>
                                        <div class="form-hint">
                                            {{
                                                dingtalkSwitchDisabled
                                                    ? '先填写 Webhook URL 才能开启钉钉通知'
                                                    : '开启后电量预警会发送到钉钉群'
                                            }}
                                        </div>
                                    </div>
                                </el-form-item>
                            </el-form>
                        </el-collapse-item>

                        <el-collapse-item title="微信测试号通知" name="wechat">
                            <el-form class="notify-form" label-width="140px" label-position="left">
                                <el-form-item label="微信通知">
                                    <div class="notify-field">
                                        <div class="notify-switch-row">
                                            <el-switch
                                                v-model="wechatForm.notify_wechat_enabled"
                                                :active-value="1"
                                                :inactive-value="0"
                                                :disabled="notifyLoading || notifySaving"
                                            />
                                        </div>
                                        <div class="form-hint">需用户自己注册测试号并关注后自动绑定 openid。</div>
                                    </div>
                                </el-form-item>

                                <el-form-item label="appID">
                                    <div class="notify-field">
                                        <el-input
                                            v-model="wechatForm.app_id"
                                            placeholder="wx..."
                                            clearable
                                            :disabled="notifyLoading || notifySaving"
                                        />
                                        <div class="form-hint">用于拼接回调 URL：/wechat/&lt;appId&gt;/callback</div>
                                    </div>
                                </el-form-item>

                                <el-form-item label="appsecret">
                                    <div class="notify-field">
                                        <el-input
                                            v-model="wechatForm.app_secret"
                                            :placeholder="'填入 appsecret'"
                                            clearable
                                            :disabled="notifyLoading || notifySaving"
                                        />
                                        <div class="form-hint">仅用于服务端换取 access_token，请勿泄露。</div>
                                    </div>
                                </el-form-item>

                                <el-form-item label="URL">
                                    <div class="notify-field">
                                        <el-input :model-value="wechatCallbackUrl" readonly :disabled="notifyLoading" />
                                    </div>
                                </el-form-item>

                                <el-form-item label="Token">
                                    <div class="notify-field">
                                        <el-input
                                            v-model="wechatForm.token"
                                            placeholder="与测试号后台接口配置信息 Token 保持一致"
                                            clearable
                                            :disabled="notifyLoading || notifySaving"
                                        >
                                            <template #append>
                                                <el-button
                                                    :disabled="notifyLoading || notifySaving"
                                                    @click="generateWeChatToken"
                                                    >生成</el-button
                                                >
                                            </template>
                                        </el-input>
                                        <div
                                            class="notify-switch-row"
                                            style="gap: 8px; flex-wrap: wrap; row-gap: 8px; justify-content: flex-start"
                                        >
                                            <el-button
                                                size="small"
                                                :disabled="!wechatCallbackUrl || notifyLoading"
                                                @click="copyText(wechatCallbackUrl)"
                                                >复制 URL</el-button
                                            >
                                            <el-button
                                                size="small"
                                                :disabled="!wechatForm.token.trim() || notifyLoading"
                                                @click="copyText(wechatForm.token.trim())"
                                                >复制 Token</el-button
                                            >
                                        </div>
                                        <div class="form-hint">测试号管理“接口配置信息”中填写该 URL 和 Token。</div>
                                    </div>
                                </el-form-item>

                                <el-form-item label="JS安全域名">
                                    <div class="notify-field">
                                        <el-input :model-value="wechatJsDomain" readonly :disabled="notifyLoading" />
                                        <div class="notify-switch-row" style="gap: 8px">
                                            <el-button
                                                size="small"
                                                :disabled="notifyLoading || notifySaving"
                                                @click="copyText(wechatJsDomain)"
                                                >复制</el-button
                                            >
                                        </div>
                                        <div class="form-hint">测试号后台“JS 接口安全域名”填写该域名。</div>
                                    </div>
                                </el-form-item>

                                <el-form-item label="模板内容">
                                    <div class="notify-field">
                                        <el-input
                                            :model-value="wechatTemplateContent"
                                            type="textarea"
                                            autosize
                                            readonly
                                        />
                                        <div class="notify-switch-row" style="gap: 8px">
                                            <el-button
                                                size="small"
                                                :disabled="notifyLoading || notifySaving"
                                                @click="copyText(wechatTemplateContent)"
                                                >复制模板内容</el-button
                                            >
                                        </div>
                                        <div class="form-hint">
                                            用于在测试号后台创建模板时填写“内容”。（模板标题可随便写）
                                        </div>
                                    </div>
                                </el-form-item>

                                <el-form-item label="模板ID">
                                    <div class="notify-field">
                                        <el-input
                                            v-model="wechatForm.template_id"
                                            placeholder="用于接口调用发送模板消息"
                                            clearable
                                            :disabled="notifyLoading || notifySaving"
                                        />
                                    </div>
                                </el-form-item>

                                <el-form-item label="已订阅用户">
                                    <div class="notify-field">
                                        <div class="notify-switch-row" style="gap: 8px">
                                            <el-button
                                                size="small"
                                                type="primary"
                                                plain
                                                :loading="wechatTestSending"
                                                :disabled="
                                                    notifyLoading || notifySaving || wechatTestSending || !wechatBound
                                                "
                                                @click="sendWeChatTestNotification"
                                                >测试通知</el-button
                                            >
                                            <el-button
                                                size="small"
                                                type="danger"
                                                plain
                                                :disabled="notifyLoading || notifySaving || !wechatBound"
                                                @click="unbindWeChatTestAccount"
                                                >解绑测试号</el-button
                                            >
                                        </div>

                                        <el-table
                                            :data="wechatFollowersDisplay"
                                            :loading="wechatFollowersRefreshing"
                                            size="small"
                                            border
                                            style="width: 100%"
                                            :empty-text="'暂无关注者（请先关注测试号）'"
                                        >
                                            <el-table-column label="OpenID" min-width="280">
                                                <template #default="{ row }">
                                                    <span
                                                        style="
                                                            font-family:
                                                                ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
                                                                monospace;
                                                        "
                                                    >
                                                        {{ row.openid }}
                                                    </span>
                                                </template>
                                            </el-table-column>
                                        </el-table>

                                        <div class="form-hint">
                                            打开设置页会自动从微信同步；取消关注后该 OpenID 会从列表中移除。
                                        </div>
                                        <div
                                            v-if="wechatFollowersSyncError"
                                            class="form-hint"
                                            style="color: var(--el-color-danger)"
                                        >
                                            {{ wechatFollowersSyncError }}
                                        </div>
                                    </div>
                                </el-form-item>
                            </el-form>
                        </el-collapse-item>
                    </el-collapse>
                </div>

                <template #footer>
                    <span class="dialog-footer">
                        <el-button @click="showNotifyDialog = false">取消</el-button>
                        <el-button
                            type="primary"
                            :loading="notifySaving"
                            :disabled="notifyLoading || notifySaving || !notifyReady"
                            @click="saveNotifySettings"
                            >保存</el-button
                        >
                    </span>
                </template>
            </el-dialog>
        </el-main>
        <el-footer class="dashboard-footer">
            <div class="footer-content">
                <div class="footer-icon">
                    <svg height="22" width="22" viewBox="0 0 24 24" fill="none">
                        <!-- Message Bubble Outline -->
                        <path
                            d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z"
                            fill="#909399"
                        />
                        <!-- Small Heart Inside - Vertically Centered -->
                        <path
                            d="M12 15.5L11.15 14.72C8.3 12.15 6.5 10.44 6.5 8.4C6.5 6.73 7.73 5.5 9.3 5.5C10.16 5.5 10.99 5.93 11.5 6.61C12.01 5.93 12.84 5.5 13.7 5.5C15.27 5.5 16.5 6.73 16.5 8.4C16.5 10.44 14.7 12.15 11.85 14.72L12 15.5Z"
                            fill="#909399"
                            opacity="0.8"
                        />
                    </svg>
                </div>
                <div class="footer-text">
                    喜欢我们的项目？<a
                        href="https://github.com/iBUHub/TJUEcard"
                        target="_blank"
                        class="footer-link-bold"
                        >在 GitHub 添加星标</a
                    >并<a href="https://github.com/iBUHub/TJUEcard/issues" target="_blank" class="footer-link-bold"
                        >分享您宝贵的建议</a
                    >!
                </div>
            </div>
        </el-footer>
    </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch, defineComponent, h } from 'vue';
import api from '../api';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { spacingText } from '../utils/pangu';
import { useTheme } from '../composables/useTheme';
import { Moon, Sunny, Monitor, Refresh, Setting } from '@element-plus/icons-vue';

const LogoutDoorIcon = defineComponent({
    name: 'LogoutDoorIcon',
    setup() {
        return () =>
            h(
                'svg',
                {
                    fill: 'none',
                    height: '1em',
                    stroke: 'currentColor',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: 2,
                    viewBox: '0 0 24 24',
                    width: '1em',
                    xmlns: 'http://www.w3.org/2000/svg',
                },
                [
                    h('path', {
                        d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4',
                    }),
                    h('polyline', {
                        points: '16 17 21 12 16 7',
                    }),
                    h('line', {
                        x1: 21,
                        x2: 9,
                        y1: 12,
                        y2: 12,
                    }),
                ]
            );
    },
});

interface Room {
    id: number;
    alias_name: string | null;
    full_name?: string | null;
    system_id: string;
    area_id: string;
    building_id: string | null;
    floor_id: string | null;
    room_id: string;
    notification_threshold: number;
    last_electricity?: number | null;
    last_query_status?: string | null;
    next_query_time?: string | null;
    last_query_time?: string | null;
    is_active?: number;
}

const { theme, setupTheme } = useTheme();
setupTheme();
const router = useRouter();
const rooms = ref<Room[]>([]);
const loading = ref(false);
const showAddDialog = ref(false);
const isEditMode = ref(false);
const editingRoomId = ref<number | ''>('');
const submitLoading = ref(false);

const showNotifyDialog = ref(false);
const notifyCollapseActive = ref<string[]>([]);
const notifyLoading = ref(false);
const notifySaving = ref(false);
const notifyReady = ref(false);
const notifyForm = ref({
    dingtalk_webhook_url: '',
    notify_dingtalk_enabled: 0 as 0 | 1,
    notify_email_enabled: 1 as 0 | 1,
});

const wechatBound = ref(false);
const wechatHasAppSecret = ref(false);
const wechatFollowers = ref<Array<{ openid: string }>>([]);
const wechatForm = ref({
    app_id: '',
    app_secret: '',
    notify_wechat_enabled: 0 as 0 | 1,
    template_id: '',
    token: '',
    updated_at: '',
});

const resolveWeChatCallbackBase = () => {
    // Default: use the current frontend origin as callback base.
    // This works for both dev and prod as long as `/wechat/*` is routed/proxied to the backend.
    return window.location.origin.replace(/\/+$/, '');
};

const wechatCallbackBase = resolveWeChatCallbackBase();

const wechatCallbackUrl = computed(() => {
    const appId = wechatForm.value.app_id.trim();
    if (!appId) return '';
    return `${wechatCallbackBase}/wechat/${appId}/callback`;
});

const wechatTemplateContent =
    '{{first.DATA}}\n房间：{{keyword1.DATA}}\n当前电量：{{keyword2.DATA}}\n提醒阈值：{{keyword3.DATA}}\n{{remark.DATA}}';

const wechatJsDomain = window.location.hostname;

const dingtalkSwitchDisabled = computed(() => !notifyForm.value.dingtalk_webhook_url.trim());

watch(
    () => notifyForm.value.dingtalk_webhook_url,
    v => {
        if (!v || !v.trim()) notifyForm.value.notify_dingtalk_enabled = 0;
    }
);

const resetWeChatForm = () => {
    wechatForm.value = {
        app_id: '',
        app_secret: '',
        notify_wechat_enabled: 0 as 0 | 1,
        template_id: '',
        token: '',
        updated_at: '',
    };
    wechatHasAppSecret.value = false;
    wechatFollowers.value = [];
};

const wechatFollowersRefreshing = ref(false);
const wechatTestSending = ref(false);
const wechatFollowersSyncError = ref('');
const wechatFollowersDisplay = computed(() =>
    wechatFollowers.value.map(f => ({ openid: (f.openid || '').trim() })).filter(f => f.openid)
);

const refreshWeChatFollowers = async (opts?: { silent?: boolean }) => {
    if (wechatFollowersRefreshing.value) return;
    wechatFollowersRefreshing.value = true;
    wechatFollowersSyncError.value = '';
    try {
        const res = await api.post('/user/wechat-test-account/refresh-followers');
        if (res.data && Array.isArray(res.data.followers)) {
            wechatFollowers.value = res.data.followers;
        }
        if (res.data?.error) {
            wechatFollowersSyncError.value = String(res.data.error);
            if (!opts?.silent) ElMessage.warning(wechatFollowersSyncError.value);
        }
        if (Array.isArray(res.data?.errors) && res.data.errors.length > 0) {
            const msg = String(res.data.errors[0]);
            wechatFollowersSyncError.value = msg;
            if (!opts?.silent) ElMessage.warning(msg);
        }
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resp = (e as any).response;
        const data = resp?.data;
        if (data && Array.isArray(data.followers)) {
            wechatFollowers.value = data.followers;
        }
        const msg = data?.error || '同步失败';
        wechatFollowersSyncError.value = String(msg);
        if (!opts?.silent) ElMessage.error(wechatFollowersSyncError.value);
    } finally {
        wechatFollowersRefreshing.value = false;
    }
};

const loadNotifySettings = async () => {
    notifyLoading.value = true;
    notifyReady.value = false;
    try {
        try {
            const res = await api.get('/user/notification-settings');
            notifyForm.value.notify_email_enabled = res.data.notify_email_enabled ? 1 : 0;
            notifyForm.value.notify_dingtalk_enabled = res.data.notify_dingtalk_enabled ? 1 : 0;
            notifyForm.value.dingtalk_webhook_url = res.data.dingtalk_webhook_url || '';
            notifyReady.value = true;
        } catch (e) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ElMessage.error((e as any).response?.data?.error || '加载通知设置失败');
            notifyReady.value = false;
        }

        try {
            const res = await api.get('/user/wechat-test-account');
            if (res.data && res.data.bound) {
                wechatBound.value = true;
                wechatHasAppSecret.value = !!res.data.has_app_secret;
                wechatForm.value.app_id = res.data.app_id || '';
                wechatForm.value.token = res.data.token || '';
                wechatForm.value.template_id = res.data.template_id || '';
                wechatForm.value.notify_wechat_enabled = res.data.notify_wechat_enabled ? 1 : 0;
                wechatForm.value.app_secret = res.data.app_secret || '';
                wechatForm.value.updated_at = res.data.updated_at || '';
                wechatFollowers.value = Array.isArray(res.data.followers) ? res.data.followers : [];
            } else {
                wechatBound.value = false;
                wechatFollowersSyncError.value = '';
                resetWeChatForm();
            }
        } catch {
            wechatBound.value = false;
            wechatFollowersSyncError.value = '';
            resetWeChatForm();
        }
    } finally {
        notifyLoading.value = false;
    }
};

const openNotifyDialog = async () => {
    showNotifyDialog.value = true;
    notifyCollapseActive.value = [];
    notifyReady.value = false;
    await loadNotifySettings();
    // Auto sync followers from WeChat on open (silent, non-blocking).
    if (wechatBound.value) void refreshWeChatFollowers({ silent: true });
};

const notifyDialogClosed = () => {
    notifySaving.value = false;
    notifyLoading.value = false;
    notifyReady.value = false;
    notifyCollapseActive.value = [];
    wechatBound.value = false;
    wechatHasAppSecret.value = false;
    wechatFollowersSyncError.value = '';
    resetWeChatForm();
};

const generateWeChatToken = () => {
    try {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        wechatForm.value.token = Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    } catch {
        wechatForm.value.token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
};

const copyText = async (text: string) => {
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        ElMessage.success('已复制');
    } catch {
        ElMessage.error('复制失败，请手动复制');
    }
};

const unbindWeChatTestAccount = async () => {
    try {
        await ElMessageBox.confirm(
            '确认解绑该测试号？解绑将删除已保存的 appID/appsecret/Token/模板ID/接收者绑定，并清空关注者列表。解绑后如需继续使用需重新配置并重新关注以绑定 openid。',
            '解绑测试号',
            {
                confirmButtonText: '解绑',
                type: 'warning',
            }
        );
    } catch {
        return;
    }

    notifySaving.value = true;
    try {
        await api.delete('/user/wechat-test-account');
        wechatBound.value = false;
        wechatFollowersSyncError.value = '';
        resetWeChatForm();
        ElMessage.success('已解绑');
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ElMessage.error((e as any).response?.data?.error || '解绑失败');
    } finally {
        notifySaving.value = false;
    }
};

const sendWeChatTestNotification = async () => {
    if (notifyLoading.value || notifySaving.value || wechatTestSending.value) return;
    if (!wechatBound.value) {
        ElMessage.warning('请先保存并绑定微信测试号配置，再发送测试通知');
        return;
    }

    wechatTestSending.value = true;
    try {
        const res = await api.post('/user/wechat-test-account/test-notify');
        const sent = Number(res.data?.sent ?? 0);
        const failed = Number(res.data?.failed ?? 0);
        const warning = (res.data?.warning || '').trim();
        ElMessage.success(`测试通知已发送：成功 ${sent}，失败 ${failed}`);
        if (warning) ElMessage.warning(warning);
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (e as any).response?.data?.error || '测试通知发送失败';
        ElMessage.error(String(msg));
    } finally {
        wechatTestSending.value = false;
    }
};

const saveNotifySettings = async () => {
    if (notifyLoading.value || notifySaving.value || !notifyReady.value) return;
    const dingtalkUrl = notifyForm.value.dingtalk_webhook_url.trim();
    if (notifyForm.value.notify_dingtalk_enabled === 1 && !dingtalkUrl) {
        ElMessage.error('请先填写钉钉 Webhook URL');
        return;
    }

    const shouldSaveWeChat =
        wechatForm.value.notify_wechat_enabled === 1 ||
        !!wechatForm.value.app_id.trim() ||
        !!wechatForm.value.token.trim() ||
        !!wechatForm.value.template_id.trim() ||
        !!wechatForm.value.app_secret.trim();

    // Validate WeChat required fields BEFORE saving any settings, to avoid partial updates.
    if (shouldSaveWeChat) {
        if (!wechatForm.value.app_id.trim()) {
            ElMessage.error('请填写微信测试号 appID');
            return;
        }
        if (!wechatForm.value.token.trim()) {
            ElMessage.error('请填写 Token（需与测试号后台一致）');
            return;
        }
        if (!wechatForm.value.app_secret.trim()) {
            ElMessage.error('请填写 appsecret（不可留空）');
            return;
        }
        if (!wechatForm.value.template_id.trim()) {
            ElMessage.error('请填写模板ID');
            return;
        }
    }

    notifySaving.value = true;
    try {
        const res = await api.put('/user/notification-settings', {
            dingtalk_webhook_url: dingtalkUrl,
            notify_dingtalk_enabled: notifyForm.value.notify_dingtalk_enabled,
            notify_email_enabled: notifyForm.value.notify_email_enabled,
        });

        notifyForm.value.notify_email_enabled = res.data.notify_email_enabled ? 1 : 0;
        notifyForm.value.notify_dingtalk_enabled = res.data.notify_dingtalk_enabled ? 1 : 0;
        notifyForm.value.dingtalk_webhook_url = res.data.dingtalk_webhook_url || '';

        if (res.data.dingtalk_enable_notified) ElMessage.success('钉钉通知已开启，已发送一条开启通知');

        const shouldClearWeChat =
            wechatBound.value &&
            wechatForm.value.notify_wechat_enabled === 0 &&
            !wechatForm.value.app_id.trim() &&
            !wechatForm.value.app_secret.trim() &&
            !wechatForm.value.token.trim() &&
            !wechatForm.value.template_id.trim();

        if (shouldClearWeChat) {
            try {
                await api.delete('/user/wechat-test-account');
                wechatBound.value = false;
                wechatFollowersSyncError.value = '';
                resetWeChatForm();
            } catch (e) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ElMessage.error((e as any).response?.data?.error || '微信配置清空失败');
                return;
            }
        } else if (shouldSaveWeChat) {
            try {
                await api.put('/user/wechat-test-account', {
                    app_id: wechatForm.value.app_id.trim(),
                    // Send empty string if user clears it; backend will reject and prompt to fix.
                    app_secret: wechatForm.value.app_secret.trim(),
                    notify_wechat_enabled: wechatForm.value.notify_wechat_enabled,
                    template_id: wechatForm.value.template_id.trim(),
                    token: wechatForm.value.token.trim(),
                });

                // Keep local state consistent without extra GET calls.
                wechatBound.value = true;
                if (wechatForm.value.app_secret.trim()) wechatHasAppSecret.value = true;
            } catch (e) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ElMessage.error((e as any).response?.data?.error || '微信配置保存失败');
                return;
            }
        }

        if (!res.data.dingtalk_enable_notified) ElMessage.success('已保存通知设置');

        showNotifyDialog.value = false;
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ElMessage.error((e as any).response?.data?.error || '保存失败');
    } finally {
        notifySaving.value = false;
    }
};

const addForm = ref({
    alias_name: '',
    area_id: '',
    building_id: '',
    floor_id: '',
    notification_threshold: -1,
    room_id: '',
    system_id: '',
});

// Time utilities
const now = ref(new Date());
let timer: number | undefined;

const parseUtcDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    // Assume DB returns 'YYYY-MM-DD HH:mm:ss' in UTC
    // Replace space with T and append Z to ensure it's treated as UTC
    const date = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (isNaN(date.getTime())) return null;
    return date;
};

const isQuerying = (row: Room) => {
    if (!row.next_query_time) return false;
    const nextTime = parseUtcDate(row.next_query_time);
    return nextTime ? now.value >= nextTime : false;
};

const getStatusLabel = (row: Room) => {
    const isQueryingNow = isQuerying(row);
    if (isQueryingNow && (row.is_active ?? 1) === 1) return '正在查询';
    else if (isQueryingNow) return '停止订阅';
    return row.last_query_status === 'success'
        ? '查询成功'
        : row.last_query_status === 'failed'
          ? '查询失败'
          : '等待查询';
};

const getStatusType = (row: Room) => {
    if (isQuerying(row)) return ''; // Default/Primary color for querying
    if (row.last_query_status === 'success') return 'success';
    if (row.last_query_status === 'failed') return 'danger';
    return 'info';
};

const formatNextTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '-';
    const date = parseUtcDate(timeStr);
    if (!date) return '-';

    // Format: MM-DD HH:mm
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
};

interface RoomOption {
    id: string;
    name: string;
    children?: RoomOption[];
}

// Cascading Dropdown State
const fullOptions = ref<RoomOption[]>([]);
const selectedSystemId = ref('');
const selectedAreaId = ref('');
const selectedDistrictId = ref('');
const selectedBuildingId = ref('');
const selectedFloorId = ref('');
const selectedRoomId = ref('');

// Computed Options
const systemOptions = computed(() => fullOptions.value);
const areaOptions = computed(() => {
    const sys = fullOptions.value.find(i => i.id === selectedSystemId.value);
    return sys?.children || [];
});
const districtOptions = computed(() => {
    const area = areaOptions.value.find(i => i.id === selectedAreaId.value);
    return area?.children || [];
});
const buildingOptions = computed(() => {
    const dist = districtOptions.value.find(i => i.id === selectedDistrictId.value);
    return dist?.children || [];
});
const floorOptions = computed(() => {
    const build = buildingOptions.value.find(i => i.id === selectedBuildingId.value);
    return build?.children || [];
});
const roomOptions = computed(() => {
    const floor = floorOptions.value.find(i => i.id === selectedFloorId.value);
    return floor?.children || [];
});

// Handlers
const onSystemChange = () => {
    selectedAreaId.value = '';
    selectedDistrictId.value = '';
    selectedBuildingId.value = '';
    selectedFloorId.value = '';
    selectedRoomId.value = '';

    if (areaOptions.value.length === 1) {
        selectedAreaId.value = areaOptions.value[0].id;
        onAreaChange();
    }
};
const onAreaChange = () => {
    selectedDistrictId.value = '';
    selectedBuildingId.value = '';
    selectedFloorId.value = '';
    selectedRoomId.value = '';

    if (districtOptions.value.length === 1) {
        selectedDistrictId.value = districtOptions.value[0].id;
        onDistrictChange();
    }
};
const onDistrictChange = () => {
    selectedBuildingId.value = '';
    selectedFloorId.value = '';
    selectedRoomId.value = '';

    if (buildingOptions.value.length === 1) {
        selectedBuildingId.value = buildingOptions.value[0].id;
        onBuildingChange();
    }
};
const onBuildingChange = () => {
    selectedFloorId.value = '';
    selectedRoomId.value = '';

    if (floorOptions.value.length === 1) {
        selectedFloorId.value = floorOptions.value[0].id;
        onFloorChange();
    }
};
const onFloorChange = () => {
    selectedRoomId.value = '';

    if (roomOptions.value.length === 1) {
        selectedRoomId.value = roomOptions.value[0].id;
        onRoomChange();
    }
};
const onRoomChange = () => {
    // Populate addForm when a room is selected
    addForm.value.system_id = selectedSystemId.value;
    addForm.value.area_id = selectedAreaId.value;
    addForm.value.building_id = selectedBuildingId.value;
    addForm.value.floor_id = selectedFloorId.value;
    addForm.value.room_id = selectedRoomId.value;

    // Set default alias
    const room = roomOptions.value.find(i => i.id === selectedRoomId.value);
    if (room) {
        addForm.value.alias_name = room.name.trim();
    }
};

const loadOptions = async () => {
    try {
        const res = await axios.get('/rooms.json?t=' + new Date().getTime());
        fullOptions.value = res.data;
    } catch (e) {
        console.error('Failed to load rooms.json', e);
    }
};

const fetchRooms = async () => {
    loading.value = true;
    now.value = new Date(); // Update time reference
    try {
        const res = await api.get('/rooms');
        rooms.value = res.data;
    } catch {
        ElMessage.error('加载订阅失败（无法连接服务器）');
    } finally {
        loading.value = false;
        nextTick(() => {
            checkScrollbar();
        });
    }
};

const submitAddRoom = async () => {
    submitLoading.value = true;
    try {
        addForm.value.alias_name = addForm.value.alias_name?.trim();

        // Construct Full Name from selected options
        const sys = systemOptions.value.find(i => i.id === selectedSystemId.value)?.name?.trim();
        const dist = districtOptions.value.find(i => i.id === selectedDistrictId.value)?.name?.trim();
        const build = buildingOptions.value.find(i => i.id === selectedBuildingId.value)?.name?.trim();
        const floor = floorOptions.value.find(i => i.id === selectedFloorId.value)?.name?.trim();
        const room = roomOptions.value.find(i => i.id === selectedRoomId.value)?.name?.trim();

        // Filter out undefined and empty strings
        // Exclude 'area' from the full name as requested
        const nameParts = [sys, dist, build, floor, room].filter(part => part && part.trim());
        const fullName = nameParts.join(' - ');

        const payload = {
            ...addForm.value,
            full_name: fullName,
        };

        if (isEditMode.value) {
            await api.put(`/rooms/${editingRoomId.value}`, payload);
            ElMessage.success('房间修改成功');
        } else {
            await api.post('/rooms', payload);
            ElMessage.success('房间已添加');
        }
        showAddDialog.value = false;
        fetchRooms();
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ElMessage.error((e as any).response?.data?.error || (isEditMode.value ? '修改失败' : '添加房间失败'));
    } finally {
        submitLoading.value = false;
    }
};

const openEditDialog = (room: Room) => {
    isEditMode.value = true;
    editingRoomId.value = room.id;

    // Pre-fill selection state
    selectedSystemId.value = room.system_id;
    selectedAreaId.value = room.area_id;
    selectedDistrictId.value = '';

    // Find district
    const sys = fullOptions.value.find(s => s.id === room.system_id);
    const area = sys?.children?.find(a => a.id === room.area_id);
    const district = area?.children?.find(d => d.children?.some(b => b.id === room.building_id));

    if (district) {
        selectedDistrictId.value = district.id;
    }

    selectedBuildingId.value = room.building_id || '';
    selectedFloorId.value = room.floor_id || '';
    selectedRoomId.value = room.room_id;

    // Pre-fill form
    addForm.value = {
        alias_name: room.alias_name || '',
        area_id: room.area_id,
        building_id: room.building_id || '',
        floor_id: room.floor_id || '',
        notification_threshold: room.notification_threshold,
        room_id: room.room_id,
        system_id: room.system_id,
    };

    showAddDialog.value = true;
};

const resetForm = () => {
    isEditMode.value = false;
    editingRoomId.value = '';
    selectedSystemId.value = '';
    selectedAreaId.value = '';
    selectedDistrictId.value = '';
    selectedBuildingId.value = '';
    selectedFloorId.value = '';
    selectedRoomId.value = '';
    addForm.value = {
        alias_name: '',
        area_id: '',
        building_id: '',
        floor_id: '',
        notification_threshold: -1,
        room_id: '',
        system_id: '',
    };
};

const toggleSubscription = async (room: Room) => {
    try {
        const res = await api.patch(`/rooms/${room.id}/toggle`);
        ElMessage.success(res.data.message);
        // Update local state
        room.is_active = res.data.is_active;
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ElMessage.error((e as any).response?.data?.error || '切换订阅状态失败');
        // Revert the switch state on error
        room.is_active = room.is_active === 1 ? 0 : 1;
    }
};

const deleteRoom = (id: number) => {
    ElMessageBox.confirm('确定要取消订阅吗？', '警告', {
        cancelButtonText: '取消',
        confirmButtonText: '确定',
        type: 'warning',
    }).then(async () => {
        try {
            await api.delete(`/rooms/${id}`);
            ElMessage.success('已删除');
            fetchRooms();
        } catch {
            ElMessage.error('删除失败');
        }
    });
};

const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
};

const confirmLogout = () => {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        autofocus: false,
        cancelButtonText: '取消',
        closeOnClickModal: false,
        confirmButtonText: '退出登录',
        type: 'warning',
    })
        .then(() => logout())
        .catch(() => undefined);
};

const themeIcon = computed(() => {
    switch (theme.value) {
        case 'light':
            return Sunny;
        case 'dark':
            return Moon;
        default:
            return Monitor;
    }
});

const toggleTheme = () => {
    switch (theme.value) {
        case 'light':
            theme.value = 'dark';
            break;
        case 'dark':
            theme.value = 'auto';
            break;
        default:
            theme.value = 'light';
            break;
    }
};

let resizeObserver: ResizeObserver | null = null;

const checkScrollbar = () => {
    // Element Plus uses el-scrollbar internally, the actual scroll container is .el-scrollbar__wrap
    const scrollWrap = document.querySelector(
        '.rooms-table .el-table__body-wrapper .el-scrollbar__wrap'
    ) as HTMLElement | null;
    const tableBody = document.querySelector('.rooms-table .el-table__body') as HTMLElement | null;

    if (scrollWrap) {
        // Strict inequality is sufficient as scrollWidth and clientWidth are usually integers or consistently rounded
        const hasScroll = scrollWrap.scrollWidth > scrollWrap.clientWidth;

        // Directly apply margin style to the table body (content), not the wrapper
        if (tableBody) {
            tableBody.style.marginBottom = hasScroll ? '9.3px' : '0px';
        }
    }
};

// Watch for data changes to re-check scrollbar
watch(
    rooms,
    () => {
        nextTick(() => {
            checkScrollbar();
        });
    },
    { deep: true }
);

onMounted(() => {
    fetchRooms();
    loadOptions();

    // Update 'now' every minute to refresh status
    timer = window.setInterval(() => {
        now.value = new Date();
    }, 60000);

    nextTick(() => {
        const scrollWrap = document.querySelector('.rooms-table .el-table__body-wrapper .el-scrollbar__wrap');
        if (scrollWrap) {
            resizeObserver = new ResizeObserver(() => {
                checkScrollbar();
            });
            resizeObserver.observe(scrollWrap);
            // Also observe the table body content size change
            const tableBody = document.querySelector('.rooms-table .el-table__body');
            if (tableBody) {
                resizeObserver.observe(tableBody);
            }
            // Initial check
            checkScrollbar();
        }
    });

    window.addEventListener('resize', checkScrollbar);
});

onUnmounted(() => {
    if (timer) {
        clearInterval(timer);
    }
    if (resizeObserver) {
        resizeObserver.disconnect();
    }
    window.removeEventListener('resize', checkScrollbar);
});
</script>

<style scoped>
.layout-container {
    height: 100vh;
    background: var(--app-bg);
    display: flex;
    flex-direction: column;
}

.layout-container :deep(.el-main) {
    padding-bottom: 100px;
    flex: 1;
    overflow-y: auto;
}

.dashboard-header {
    background: var(--header-bg);
    border-bottom: var(--header-border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-right {
    display: flex;
    align-items: center;
    gap: 6px;
}

.notify-settings-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.6);
    color: #fff;
    font-size: 18px;
}

.notify-settings-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: #fff;
}

.form-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.3;
    margin: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
}

.form-hint a {
    color: #667eea;
    text-decoration: none;
}

.form-hint a:hover {
    text-decoration: underline;
}

.notify-field {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.notify-switch-row {
    display: flex;
    align-items: center;
    min-height: 32px;
    gap: 8px;
}

.notify-switch-row :deep(.el-button + .el-button) {
    margin-left: 0;
}

.notify-collapse :deep(.el-collapse-item__header),
.notify-collapse :deep(.el-collapse-item__title),
.notify-collapse :deep(.el-collapse-item__content) {
    white-space: normal;
}

.notify-collapse :deep(.el-collapse-item__content) {
    word-break: break-word;
}

.notify-form :deep(.el-form-item__label) {
    justify-content: flex-start;
    text-align: left;
}

.notify-form :deep(.el-form-item__content) {
    min-width: 0;
}

.notify-section-divider {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 14px 0 6px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    user-select: none;
}

.notify-section-divider::before,
.notify-section-divider::after {
    content: '';
    height: 1px;
    background: var(--el-border-color-lighter);
    flex: 1;
}

.notify-section-divider > span {
    padding: 0 2px;
    white-space: nowrap;
}

.threshold-field {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.threshold-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.2;
}

.header-title {
    color: #fff;
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.logout-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.6);
    color: #fff;
    font-size: 18px;
}

.logout-btn :deep(.el-icon) {
    font-size: 20px;
}

.logout-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: #fff;
}

.theme-toggle-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.6);
    color: #fff;
    font-size: 18px;
}

.theme-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: #fff;
}

.actions {
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.refresh-btn {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
    color: var(--el-text-color-regular);
    box-shadow: var(--el-box-shadow-light);
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
    width: 36px;
    height: 36px;
    font-size: 16px;
}

.refresh-btn:hover {
    color: var(--refresh-btn-hover-color);
    border-color: var(--refresh-btn-hover-color);
    transform: rotate(180deg);
    box-shadow: 0 4px 12px var(--refresh-btn-hover-shadow);
}

.add-room-btn {
    background: var(--primary-btn-bg);
    border: none;
    box-shadow: 0 2px 8px var(--primary-btn-shadow);
    transition: all 0.3s ease;
}

.add-room-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--primary-btn-hover-shadow);
}

.rooms-table {
    background: var(--table-bg);
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    --el-table-bg-color: var(--table-bg); /* Override Element Plus var */
    --el-table-tr-bg-color: var(--table-bg); /* Override Element Plus var */
    --el-table-header-bg-color: transparent; /* We handle header bg on wrapper */
}

:deep(.rooms-table .el-table__row),
:deep(.rooms-table .el-table__cell) {
    transition: none !important;
}

/* Remove subscription switch color transition on the home table */
:deep(.rooms-table .el-switch__core),
:deep(.rooms-table .el-switch__action) {
    transition: none !important;
}

:deep(.rooms-table .el-table__header-wrapper) {
    background: var(--table-header-bg);
}

:deep(.rooms-table .el-table__empty-block) {
    background-color: var(--table-bg) !important;
}

:deep(.el-loading-mask) {
    background-color: var(--loading-mask-bg) !important;
}

:deep(.rooms-table .el-table__row:hover > td) {
    background-color: var(--table-row-hover-bg) !important;
}

:deep(.el-dialog) {
    border-radius: 12px;
    box-shadow: var(--el-box-shadow);
}

:deep(.el-dialog__title) {
    color: #667eea;
    font-weight: 600;
    font-size: 18px;
}

.add-room-form :deep(.el-form-item__label) {
    pointer-events: none;
}

/* Mobile Responsive Styles for Add Room Dialog */
@media (max-width: 768px) {
    /* Dialog responsive width and max height */
    :deep(.add-room-dialog) {
        width: 95% !important;
        max-width: 95% !important;
    }

    :deep(.add-room-dialog .el-dialog__header) {
        padding: 15px 20px;
    }

    :deep(.add-room-dialog .el-dialog__body) {
        padding: 15px 20px;
        max-height: calc(100vh - 200px);
        overflow-y: auto;
    }

    :deep(.add-room-dialog .el-dialog__footer) {
        padding: 15px 20px;
        position: sticky;
        bottom: 0;
        background: #fff;
        border-top: 1px solid #eee;
        z-index: 1;
    }

    /* Form responsive layout */
    .add-room-form :deep(.el-form-item) {
        margin-bottom: 18px;
    }

    .add-room-form :deep(.el-form-item__label) {
        width: 70px !important;
        font-size: 14px;
        padding-right: 8px;
    }

    .add-room-form :deep(.el-form-item__content) {
        margin-left: 70px !important;
    }

    /* Input and select responsive */
    .add-room-form :deep(.el-input__wrapper),
    .add-room-form :deep(.el-select) {
        font-size: 14px;
    }

    .add-room-form :deep(.el-input-number) {
        width: 100%;
    }

    /* Divider spacing */
    .add-room-form :deep(.el-divider) {
        margin: 15px 0;
    }

    /* Helper text */
    .add-room-form :deep(.el-form-item__content > div) {
        font-size: 11px;
    }

    /* Dialog footer buttons */
    :deep(.dialog-footer) {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }

    :deep(.dialog-footer .el-button) {
        flex: 1;
        max-width: 120px;
    }
}

/* Extra small screens */
@media (max-width: 480px) {
    :deep(.add-room-dialog .el-dialog__body) {
        max-height: calc(100vh - 180px);
        padding: 12px 15px;
    }

    .add-room-form :deep(.el-form-item__label) {
        width: 60px !important;
        font-size: 13px;
    }

    .add-room-form :deep(.el-form-item__content) {
        margin-left: 60px !important;
    }

    :deep(.dialog-footer .el-button) {
        font-size: 14px;
    }
}

:deep(.add-room-dialog .el-dialog__footer) {
    background: var(--el-bg-color) !important;
    border-top: 1px solid var(--el-border-color-lighter) !important;
}

.dashboard-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px 0;
    height: auto !important;
    background: transparent;
    pointer-events: none;
    z-index: 100;
}

.footer-content {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 24px;
    background: var(--footer-bg);
    border-radius: 50px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    backdrop-filter: blur(12px);
    border: var(--footer-border);
    pointer-events: auto;
    transition:
        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    max-width: 70%;
    margin: 0 auto;
}

.footer-content:hover {
    transform: translateY(-2px);
    background: var(--footer-hover-bg);
    box-shadow: 0 12px 40px rgba(102, 126, 234, 0.2);
}

.footer-icon {
    display: flex;
    align-items: center;
}

.footer-text {
    color: var(--el-text-color-regular);
    font-size: 14px;
}

.footer-link-bold {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
    margin: 0 2px;
    transition: all 0.3s ease;
}

.footer-link-bold:hover {
    color: #764ba2;
    text-decoration: underline;
}

/* Custom Scrollbar for Table */
:deep(.rooms-table .el-scrollbar__bar.is-horizontal) {
    height: 6px !important;
    display: block !important;
    opacity: 1 !important;
}

:deep(.rooms-table .el-scrollbar__thumb) {
    background: #b9b9bb !important;
    border-radius: 4px !important;
}

/* Native scrollbar fallback for mobile */
:deep(.rooms-table .el-table__body-wrapper::-webkit-scrollbar) {
    height: 6px;
    background-color: transparent;
}

:deep(.rooms-table .el-table__body-wrapper::-webkit-scrollbar-thumb) {
    background: #b9b9bb;
    border-radius: 4px;
}

:deep(.rooms-table .el-table__body-wrapper::-webkit-scrollbar-track) {
    background-color: transparent;
}
</style>
