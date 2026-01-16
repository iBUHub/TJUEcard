<template>
    <el-container class="layout-container">
        <el-header class="dashboard-header">
            <div style="display: flex; justify-content: space-between; align-items: center; height: 100%">
                <h3 class="header-title">TJUEcard 仪表盘</h3>
                <el-button class="logout-btn" @click="logout">退出登录</el-button>
            </div>
        </el-header>
        <el-main>
            <div class="actions">
                <el-button type="primary" class="add-room-btn" @click="showAddDialog = true">添加房间</el-button>
            </div>

            <el-table v-loading="loading" :data="rooms" class="rooms-table" stripe>
                <el-table-column prop="alias_name" label="名称">
                    <template #default="scope">
                        {{ spacingText(scope.row.alias_name) }}
                    </template>
                </el-table-column>
                <el-table-column label="状态">
                    <template #default="scope">
                        <el-tag
                            :type="
                                scope.row.last_query_status === 'success'
                                    ? 'success'
                                    : scope.row.last_query_status === 'failed'
                                      ? 'danger'
                                      : 'info'
                            "
                        >
                            {{
                                scope.row.last_query_status === 'success'
                                    ? '成功'
                                    : scope.row.last_query_status === 'failed'
                                      ? '失败'
                                      : '等待中'
                            }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="last_electricity" label="电量 (kWh)">
                    <template #default="scope">
                        {{ scope.row.last_electricity ?? '-' }}
                    </template>
                </el-table-column>
                <el-table-column prop="notification_threshold" label="阈值" />
                <el-table-column label="操作">
                    <template #default="scope">
                        <el-button type="danger" size="small" @click="deleteRoom(scope.row.room_id)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <!-- Add Room Dialog -->
            <el-dialog v-model="showAddDialog" title="添加房间" width="600px">
                <el-form label-width="100px">
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
                            电量低于此值时发送邮件提醒。设置 -1 禁用。
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
    </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '../api';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { spacingText } from '../utils/pangu';

const router = useRouter();
const rooms = ref([]);
const loading = ref(false);
const showAddDialog = ref(false);
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
};
const onAreaChange = () => {
    selectedDistrictId.value = '';
    selectedBuildingId.value = '';
    selectedFloorId.value = '';
    selectedRoomId.value = '';
};
const onDistrictChange = () => {
    selectedBuildingId.value = '';
    selectedFloorId.value = '';
    selectedRoomId.value = '';
};
const onBuildingChange = () => {
    selectedFloorId.value = '';
    selectedRoomId.value = '';
};
const onFloorChange = () => {
    selectedRoomId.value = '';
};
const onRoomChange = () => {
    // Populate addForm when a room is selected
    addForm.value.system_id = selectedSystemId.value;
    addForm.value.area_id = selectedAreaId.value;
    addForm.value.building_id = selectedBuildingId.value; // Note: building_id in backend might expect 'buis' id
    // Wait, let's check fetch_all_rooms structure.
    // It maps: system -> area -> district -> buis -> floor -> room
    // So 'building_id' in API probably corresponds to 'buis' level.
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
    try {
        const res = await api.get('/rooms');
        rooms.value = res.data;
    } catch {
        ElMessage.error('加载订阅失败（无法连接服务器）');
    } finally {
        loading.value = false;
    }
};

const submitAddRoom = async () => {
    submitLoading.value = true;
    try {
        await api.post('/rooms', addForm.value);
        ElMessage.success('房间已添加');
        showAddDialog.value = false;
        fetchRooms();
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ElMessage.error((e as any).response?.data?.error || '添加房间失败');
    } finally {
        submitLoading.value = false;
    }
};

const deleteRoom = (id: string) => {
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

onMounted(() => {
    fetchRooms();
    loadOptions();
});
</script>

<style scoped>
.layout-container {
    height: 100vh;
    background: linear-gradient(to bottom, #f5f7fa 0%, #e8ecf1 100%);
}

.dashboard-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-bottom: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

.actions {
    margin-bottom: 20px;
}

.add-room-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    transition: all 0.3s ease;
}

.add-room-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}

.rooms-table {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    overflow: hidden;
}

:deep(.rooms-table .el-table__header-wrapper) {
    background: linear-gradient(to right, #f8f9fa, #e9ecef);
}

:deep(.rooms-table .el-table__row:hover) {
    background-color: #f5f7fa;
}

:deep(.el-dialog) {
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

:deep(.el-dialog__title) {
    color: #667eea;
    font-weight: 600;
    font-size: 18px;
}
</style>
