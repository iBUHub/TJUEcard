<template>
    <el-container class="stats-layout">
        <el-header class="stats-header">
            <div class="header-inner">
                <div class="title-group">
                    <el-button :icon="ArrowLeft" circle class="nav-btn" @click="goBack" />
                    <div>
                        <h3>电量统计</h3>
                        <p>{{ roomTitle }}</p>
                    </div>
                </div>
                <div class="header-actions">
                    <el-select v-model="days" class="range-select" @change="fetchStats">
                        <el-option label="近 7 天" :value="7" />
                        <el-option label="近 30 天" :value="30" />
                        <el-option label="近 90 天" :value="90" />
                    </el-select>
                    <el-button :icon="Refresh" circle class="nav-btn" :loading="loading" @click="fetchStats" />
                </div>
            </div>
        </el-header>

        <el-main v-loading="loading">
            <div v-if="errorMessage" class="empty-state">
                <el-empty :description="errorMessage">
                    <el-button type="primary" @click="goBack">返回仪表盘</el-button>
                </el-empty>
            </div>

            <template v-else>
                <section class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-icon summary-icon-power">
                            <el-icon><Lightning /></el-icon>
                        </div>
                        <div class="summary-copy">
                            <span>当前电量</span>
                            <strong>{{ formatNumber(currentElectricity) }}</strong>
                            <small>kWh</small>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon summary-icon-total">
                            <el-icon><DataLine /></el-icon>
                        </div>
                        <div class="summary-copy">
                            <span>估算消耗</span>
                            <strong>{{ formatNumber(totalUsage) }}</strong>
                            <small>kWh / {{ days }} 天</small>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon summary-icon-average">
                            <el-icon><Odometer /></el-icon>
                        </div>
                        <div class="summary-copy">
                            <span>日均消耗</span>
                            <strong>{{ formatNumber(averageDailyUsage) }}</strong>
                            <small>kWh / 天</small>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon summary-icon-records">
                            <el-icon><Tickets /></el-icon>
                        </div>
                        <div class="summary-copy">
                            <span>记录数量</span>
                            <strong>{{ readings.length }}</strong>
                            <small>次采样</small>
                        </div>
                    </div>
                </section>

                <section class="chart-section">
                    <div class="section-heading">
                        <h4>剩余电量趋势</h4>
                        <span>{{ trendSubtitle }}</span>
                    </div>
                    <div class="chart-shell">
                        <svg v-if="linePoints.length" class="chart-svg" viewBox="0 0 720 300" role="img">
                            <line x1="54" y1="24" x2="54" y2="252" class="axis-line" />
                            <line x1="54" y1="252" x2="696" y2="252" class="axis-line" />
                            <polyline :points="linePointString" class="line-path" />
                            <circle
                                v-for="point in linePoints"
                                :key="`${point.x}-${point.y}-${point.label}`"
                                :cx="point.x"
                                :cy="point.y"
                                r="4"
                                class="line-dot"
                            >
                                <title>{{ point.label }}：{{ point.value }} kWh</title>
                            </circle>
                            <text x="54" y="278" class="axis-label">{{ firstReadingLabel }}</text>
                            <text x="696" y="278" class="axis-label axis-label-end">{{ lastReadingLabel }}</text>
                            <text x="16" y="32" class="axis-label">{{ formatNumber(maxElectricity) }}</text>
                            <text x="16" y="256" class="axis-label">{{ formatNumber(minElectricity) }}</text>
                        </svg>
                        <el-empty v-else description="暂无可绘制的历史读数" />
                    </div>
                </section>

                <section class="chart-section">
                    <div class="section-heading">
                        <h4>每日估算用量</h4>
                        <span>由相邻两次剩余电量下降量估算，充值会被单独剔除</span>
                    </div>
                    <div class="chart-shell">
                        <svg v-if="usageBars.length" class="chart-svg" viewBox="0 0 720 300" role="img">
                            <line x1="54" y1="24" x2="54" y2="252" class="axis-line" />
                            <line x1="54" y1="252" x2="696" y2="252" class="axis-line" />
                            <rect
                                v-for="bar in usageBars"
                                :key="bar.date"
                                :x="bar.x"
                                :y="bar.y"
                                :width="bar.width"
                                :height="bar.height"
                                rx="3"
                                class="usage-bar"
                            >
                                <title>{{ bar.date }}：{{ formatNumber(bar.value) }} kWh</title>
                            </rect>
                            <text x="54" y="278" class="axis-label">{{ firstUsageLabel }}</text>
                            <text x="696" y="278" class="axis-label axis-label-end">{{ lastUsageLabel }}</text>
                            <text x="16" y="32" class="axis-label">{{ formatNumber(maxDailyUsage) }}</text>
                            <text x="16" y="256" class="axis-label">0</text>
                        </svg>
                        <el-empty v-else description="至少需要两次读数才能估算用量" />
                    </div>
                </section>

                <section class="history-section">
                    <div class="section-heading">
                        <h4>读数记录</h4>
                        <span v-if="rechargeCount > 0">检测到 {{ rechargeCount }} 段可能充值记录</span>
                    </div>
                    <el-table :data="historyRows" class="history-table" stripe>
                        <el-table-column prop="time" label="时间" min-width="150" />
                        <el-table-column prop="electricity" label="剩余电量 (kWh)" min-width="130" />
                        <el-table-column prop="usage" label="本段消耗 (kWh)" min-width="130" />
                        <el-table-column prop="note" label="备注" min-width="120" />
                    </el-table>
                </section>
            </template>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, DataLine, Lightning, Odometer, Refresh, Tickets } from '@element-plus/icons-vue';
import api from '../api';

type Reading = {
    electricity: number;
    id: number;
    recorded_at: string;
};

type RoomMeta = {
    alias_name: string | null;
    full_name: string | null;
    id: number;
    last_electricity: number | null;
    last_query_status: string | null;
    last_query_time: string | null;
    room_id: string;
};

type UsageInterval = {
    current: Reading;
    previous: Reading;
    recharge: number;
    usage: number;
};

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const days = ref(30);
const room = ref<RoomMeta | null>(null);
const readings = ref<Reading[]>([]);

const parseUtcDate = (dateStr: string) => new Date(dateStr.replace(' ', 'T') + 'Z');

const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return '-';
    return Number(value).toFixed(1);
};

const formatDateTime = (dateStr: string) => {
    const date = parseUtcDate(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
};

const formatDateKey = (dateStr: string) => {
    const date = parseUtcDate(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr.slice(0, 10);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
};

const roomTitle = computed(() => {
    if (!room.value) return '正在加载房间信息';
    return room.value.alias_name || room.value.full_name || room.value.room_id;
});

const currentElectricity = computed(
    () => room.value?.last_electricity ?? readings.value[readings.value.length - 1]?.electricity ?? null
);

const usageIntervals = computed<UsageInterval[]>(() => {
    const sorted = readings.value;
    return sorted.slice(1).map((current, index) => {
        const previous = sorted[index];
        const diff = previous.electricity - current.electricity;
        return {
            current,
            previous,
            recharge: diff < 0 ? Math.abs(diff) : 0,
            usage: diff > 0 ? diff : 0,
        };
    });
});

const totalUsage = computed(() => usageIntervals.value.reduce((sum, item) => sum + item.usage, 0));
const averageDailyUsage = computed(() => totalUsage.value / Math.max(days.value, 1));
const rechargeCount = computed(() => usageIntervals.value.filter(item => item.recharge > 0).length);

const electricityValues = computed(() => readings.value.map(item => item.electricity));
const minElectricity = computed(() => Math.min(...electricityValues.value, 0));
const maxElectricity = computed(() => Math.max(...electricityValues.value, 1));
const firstReadingLabel = computed(() => (readings.value[0] ? formatDateKey(readings.value[0].recorded_at) : ''));
const lastReadingLabel = computed(() =>
    readings.value.length ? formatDateKey(readings.value[readings.value.length - 1].recorded_at) : ''
);
const trendSubtitle = computed(() =>
    readings.value.length ? `${firstReadingLabel.value} 至 ${lastReadingLabel.value}` : '等待 Agent 写入历史读数'
);

const linePoints = computed(() => {
    if (readings.value.length === 0) return [];
    const min = minElectricity.value;
    const max = maxElectricity.value;
    const range = Math.max(max - min, 1);
    const usableWidth = 642;
    const usableHeight = 228;
    const denominator = Math.max(readings.value.length - 1, 1);

    return readings.value.map((reading, index) => ({
        label: formatDateTime(reading.recorded_at),
        value: reading.electricity,
        x: 54 + (index / denominator) * usableWidth,
        y: 252 - ((reading.electricity - min) / range) * usableHeight,
    }));
});

const linePointString = computed(() => linePoints.value.map(point => `${point.x},${point.y}`).join(' '));

const dailyUsage = computed(() => {
    const groups = new Map<string, number>();
    usageIntervals.value.forEach(interval => {
        if (interval.usage <= 0) return;
        const key = formatDateKey(interval.current.recorded_at);
        groups.set(key, (groups.get(key) || 0) + interval.usage);
    });
    return [...groups.entries()].map(([date, value]) => ({ date, value }));
});

const maxDailyUsage = computed(() => Math.max(...dailyUsage.value.map(item => item.value), 1));
const firstUsageLabel = computed(() => dailyUsage.value[0]?.date || '');
const lastUsageLabel = computed(() => dailyUsage.value[dailyUsage.value.length - 1]?.date || '');

const usageBars = computed(() => {
    if (dailyUsage.value.length === 0) return [];
    const gap = 8;
    const usableWidth = 642;
    const max = maxDailyUsage.value;
    const rawWidth = (usableWidth - gap * (dailyUsage.value.length - 1)) / dailyUsage.value.length;
    const width = Math.max(Math.min(rawWidth, 42), 8);
    const totalWidth = width * dailyUsage.value.length + gap * (dailyUsage.value.length - 1);
    const startX = 54 + Math.max((usableWidth - totalWidth) / 2, 0);

    return dailyUsage.value.map((item, index) => {
        const height = Math.max((item.value / max) * 228, 2);
        return {
            date: item.date,
            height,
            value: item.value,
            width,
            x: startX + index * (width + gap),
            y: 252 - height,
        };
    });
});

const historyRows = computed(() =>
    readings.value
        .map((reading, index) => {
            const interval = index === 0 ? null : usageIntervals.value[index - 1];
            return {
                electricity: formatNumber(reading.electricity),
                note: interval?.recharge ? `可能充值 +${formatNumber(interval.recharge)}` : '',
                time: formatDateTime(reading.recorded_at),
                usage: interval ? (interval.usage > 0 ? formatNumber(interval.usage) : '-') : '-',
            };
        })
        .reverse()
);

const fetchStats = async () => {
    const id = Number(route.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        errorMessage.value = '房间地址无效';
        return;
    }

    loading.value = true;
    errorMessage.value = '';
    try {
        const res = await api.get(`/rooms/${id}/readings`, {
            params: { days: days.value },
        });
        room.value = res.data.room;
        readings.value = Array.isArray(res.data.readings) ? res.data.readings : [];
    } catch {
        errorMessage.value = '读取电量统计失败';
    } finally {
        loading.value = false;
    }
};

const goBack = () => {
    router.push('/');
};

onMounted(fetchStats);
</script>

<style scoped>
.stats-layout {
    min-height: 100vh;
    background: var(--app-bg);
}

.stats-header {
    height: auto;
    min-height: 72px;
    padding: 0 24px;
    background: var(--header-bg);
    border-bottom: var(--header-border);
    color: #fff;
}

.header-inner {
    min-height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
}

.title-group,
.header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.title-group h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
}

.title-group p {
    margin: 4px 0 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.76);
}

.nav-btn {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.42);
    color: #fff;
}

.nav-btn:hover {
    background: rgba(255, 255, 255, 0.22);
    border-color: #fff;
}

.range-select {
    width: 120px;
}

.stats-layout :deep(.el-main) {
    max-width: 1120px;
    width: 100%;
    margin: 0 auto;
    padding: 28px 20px 48px;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
}

.summary-card {
    min-height: 112px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-bg-color);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.summary-icon {
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    flex: 0 0 auto;
    font-size: 22px;
}

.summary-icon-power {
    color: #409eff;
    background: rgba(64, 158, 255, 0.12);
}

.summary-icon-total {
    color: #67c23a;
    background: rgba(103, 194, 58, 0.12);
}

.summary-icon-average {
    color: #e6a23c;
    background: rgba(230, 162, 60, 0.13);
}

.summary-icon-records {
    color: #8b5cf6;
    background: rgba(139, 92, 246, 0.12);
}

.summary-copy {
    min-width: 0;
}

.summary-copy span,
.summary-copy small {
    display: block;
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.summary-copy strong {
    display: block;
    margin: 8px 0 4px;
    color: var(--el-text-color-primary);
    font-size: 30px;
    line-height: 1.1;
    font-feature-settings: 'tnum';
}

.chart-section,
.history-section {
    margin-top: 18px;
    padding: 20px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-bg-color);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.section-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
}

.section-heading h4 {
    margin: 0;
    color: var(--el-text-color-primary);
    font-size: 17px;
}

.section-heading span {
    color: var(--el-text-color-secondary);
    font-size: 13px;
    text-align: right;
}

.chart-shell {
    width: 100%;
    min-height: 320px;
    overflow-x: auto;
}

.chart-svg {
    width: 100%;
    min-width: 680px;
    height: auto;
    display: block;
}

.axis-line {
    stroke: var(--el-border-color);
    stroke-width: 1;
}

.axis-label {
    fill: var(--el-text-color-secondary);
    font-size: 12px;
}

.axis-label-end {
    text-anchor: end;
}

.line-path {
    fill: none;
    stroke: #409eff;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 3;
}

.line-dot {
    fill: #fff;
    stroke: #409eff;
    stroke-width: 2;
}

.usage-bar {
    fill: #67c23a;
}

.history-table {
    width: 100%;
}

.empty-state {
    min-height: 420px;
    display: flex;
    align-items: center;
    justify-content: center;
}

@media (max-width: 900px) {
    .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 640px) {
    .stats-header {
        padding: 10px 14px;
    }

    .header-inner {
        align-items: flex-start;
        flex-direction: column;
    }

    .header-actions {
        width: 100%;
        justify-content: space-between;
    }

    .range-select {
        flex: 1;
    }

    .stats-layout :deep(.el-main) {
        padding: 18px 12px 36px;
    }

    .summary-grid {
        grid-template-columns: minmax(0, 1fr);
    }

    .summary-card {
        min-height: 96px;
        padding: 16px;
    }

    .summary-icon {
        width: 40px;
        height: 40px;
        font-size: 20px;
    }

    .section-heading {
        align-items: flex-start;
        flex-direction: column;
    }

    .section-heading span {
        text-align: left;
    }
}
</style>
