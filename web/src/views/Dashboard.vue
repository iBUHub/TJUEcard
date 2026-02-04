<template>
    <el-container class="layout-container">
        <el-header class="dashboard-header">
            <div style="display: flex; justify-content: space-between; align-items: center; height: 100%">
                <h3 class="header-title">TJUEcard 仪表盘</h3>
                <div class="header-right">
                    <el-button class="theme-toggle-btn" circle :icon="themeIcon" @click="toggleTheme" />
                    <el-button class="logout-btn" @click="logout">退出登录</el-button>
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
                            <span v-if="isQuerying(scope.row)" class="flex-center"> 正在查询 </span>
                            <span v-else>
                                {{
                                    scope.row.last_query_status === 'success'
                                        ? '查询成功'
                                        : scope.row.last_query_status === 'failed'
                                          ? '查询失败'
                                          : '等待查询'
                                }}
                            </span>
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
                        <el-input-number v-model="addForm.notification_threshold" :min="-1" :step="1"></el-input-number>
                        <div style="font-size: 12px; color: #999; line-height: 1.2; margin-top: 5px">
                            电量低于此值时发送邮件提醒。设置 -1 为始终发送。
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
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import api from '../api';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { spacingText } from '../utils/pangu';
import { useTheme } from '../composables/useTheme';
import { Moon, Sunny, Monitor, Refresh } from '@element-plus/icons-vue';

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

const parseUtcDate = (dateStr: string) => {
    if (!dateStr) return null;
    // Assume DB returns 'YYYY-MM-DD HH:mm:ss' in UTC
    // Replace space with T and append Z to ensure it's treated as UTC
    return new Date(dateStr.replace(' ', 'T') + 'Z');
};

const isQuerying = (row: Room) => {
    if (!row.next_query_time) return false;
    const nextTime = parseUtcDate(row.next_query_time);
    return nextTime ? now.value >= nextTime : false;
};

const getStatusType = (row: Room) => {
    if (isQuerying(row)) return ''; // Default/Primary color for querying
    if (row.last_query_status === 'success') return 'success';
    if (row.last_query_status === 'failed') return 'danger';
    return 'info';
};

const formatNextTime = (timeStr: string) => {
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
        addForm.value.alias_name = room.name;
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
        // Construct Full Name from selected options
        const sys = systemOptions.value.find(i => i.id === selectedSystemId.value)?.name;
        const dist = districtOptions.value.find(i => i.id === selectedDistrictId.value)?.name;
        const build = buildingOptions.value.find(i => i.id === selectedBuildingId.value)?.name;
        const floor = floorOptions.value.find(i => i.id === selectedFloorId.value)?.name;
        const room = roomOptions.value.find(i => i.id === selectedRoomId.value)?.name;

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

    selectedBuildingId.value = room.building_id;
    selectedFloorId.value = room.floor_id;
    selectedRoomId.value = room.room_id;

    // Pre-fill form
    addForm.value = {
        alias_name: room.alias_name,
        area_id: room.area_id,
        building_id: room.building_id,
        floor_id: room.floor_id,
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

.header-title {
    color: #fff;
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.logout-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: #fff;
    transition: all 0.3s ease;
}

.logout-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
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
