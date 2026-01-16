<template>
    <el-container class="layout-container">
        <el-header>
            <div style="display: flex; justify-content: space-between; align-items: center; height: 100%">
                <h3>TJUEcard Dashboard</h3>
                <el-button @click="logout">Logout</el-button>
            </div>
        </el-header>
        <el-main>
            <div class="actions">
                <el-button type="primary" @click="showAddDialog = true">Add Room</el-button>
            </div>

            <el-table v-loading="loading" :data="rooms" style="width: 100%; margin-top: 20px">
                <el-table-column prop="alias_name" label="Name" />
                <el-table-column label="Status">
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
                            {{ scope.row.last_query_status }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="last_electricity" label="Electricity (kWh)">
                    <template #default="scope">
                        {{ scope.row.last_electricity ?? '-' }}
                    </template>
                </el-table-column>
                <el-table-column prop="notification_threshold" label="Threshold" />
                <el-table-column label="Actions">
                    <template #default="scope">
                        <el-button type="danger" size="small" @click="deleteRoom(scope.row.room_id)">Delete</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <!-- Add Room Dialog -->
            <el-dialog v-model="showAddDialog" title="Add Room" width="600px">
                <el-form label-width="100px">
                    <el-form-item label="System">
                        <el-select
                            v-model="selectedSystemId"
                            placeholder="Select System"
                            style="width: 100%"
                            @change="onSystemChange"
                        >
                            <el-option
                                v-for="item in systemOptions"
                                :key="item.id"
                                :label="item.name"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="Area">
                        <el-select
                            v-model="selectedAreaId"
                            placeholder="Select Area"
                            :disabled="!selectedSystemId"
                            style="width: 100%"
                            @change="onAreaChange"
                        >
                            <el-option v-for="item in areaOptions" :key="item.id" :label="item.name" :value="item.id" />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="District">
                        <el-select
                            v-model="selectedDistrictId"
                            placeholder="Select District"
                            :disabled="!selectedAreaId"
                            style="width: 100%"
                            @change="onDistrictChange"
                        >
                            <el-option
                                v-for="item in districtOptions"
                                :key="item.id"
                                :label="item.name"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="Building">
                        <el-select
                            v-model="selectedBuildingId"
                            placeholder="Select Building"
                            :disabled="!selectedDistrictId"
                            style="width: 100%"
                            @change="onBuildingChange"
                        >
                            <el-option
                                v-for="item in buildingOptions"
                                :key="item.id"
                                :label="item.name"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="Floor">
                        <el-select
                            v-model="selectedFloorId"
                            placeholder="Select Floor"
                            :disabled="!selectedBuildingId"
                            style="width: 100%"
                            @change="onFloorChange"
                        >
                            <el-option
                                v-for="item in floorOptions"
                                :key="item.id"
                                :label="item.name"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="Room">
                        <el-select
                            v-model="selectedRoomId"
                            placeholder="Select Room"
                            :disabled="!selectedFloorId"
                            style="width: 100%"
                            @change="onRoomChange"
                        >
                            <el-option v-for="item in roomOptions" :key="item.id" :label="item.name" :value="item.id" />
                        </el-select>
                    </el-form-item>

                    <el-divider />

                    <el-form-item label="Alias Name">
                        <el-input
                            v-model="addForm.alias_name"
                            placeholder="e.g. My Dorm (Defaults to room name)"
                        ></el-input>
                    </el-form-item>
                    <el-form-item label="Threshold">
                        <el-input-number v-model="addForm.notification_threshold" :min="-1" :step="1"></el-input-number>
                        <div style="font-size: 12px; color: #999; line-height: 1.2; margin-top: 5px">
                            Email alert when electricity is below this value. Set -1 to disable.
                        </div>
                    </el-form-item>
                </el-form>
                <template #footer>
                    <span class="dialog-footer">
                        <el-button @click="showAddDialog = false">Cancel</el-button>
                        <el-button
                            type="primary"
                            :loading="submitLoading"
                            :disabled="!selectedRoomId"
                            @click="submitAddRoom"
                            >Confirm</el-button
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
        ElMessage.error('Failed to load subscriptions (Backend may be offline)');
    } finally {
        loading.value = false;
    }
};

const submitAddRoom = async () => {
    submitLoading.value = true;
    try {
        // Need to include district_id?
        // The backend `rooms.ts` expects: { system_id, area_id, building_id, floor_id, room_id, alias_name... }
        // It does NOT invoke the proxy to fetch district.
        // However, the `rooms` table in schema.sql DOES NOT store district_id.
        // Wait, schema: CREATE TABLE rooms ( system_id, area_id, building_id, floor_id, room_id ... )
        // Where does District go?
        // In `tjuecard_main.py` query payload: 'elcarea': selection["area"]["id"], 'elcbuis': selection["buis"]["id"]...
        // The "district" seems to be an intermediate level in the scraper but maybe not needed for the final query?
        // Let's check `fetch_options` usage in `setup.py`.
        // fetch_options('buis', payload={'sysid', 'area': AREA, 'district': DISTRICT})
        // So to get the list of buildings, you need district.
        // But to QUERY the bill, the payload is:
        // 'elcarea': area, 'elcbuis': buis, 'roomNo': room
        // It seems district ID is NOT sent in the final query!

        // So `rooms.ts` backend also doesn't store district_id.
        // This confirms we don't need to save district_id in DB.

        await api.post('/rooms', addForm.value);
        ElMessage.success('Room added');
        showAddDialog.value = false;
        fetchRooms();
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ElMessage.error((e as any).response?.data?.error || 'Failed to add room');
    } finally {
        submitLoading.value = false;
    }
};

const deleteRoom = (id: string) => {
    ElMessageBox.confirm('Are you sure to unsubscribe?', 'Warning', {
        cancelButtonText: 'Cancel',
        confirmButtonText: 'Yes',
        type: 'warning',
    }).then(async () => {
        try {
            await api.delete(`/rooms/${id}`);
            ElMessage.success('Deleted');
            fetchRooms();
        } catch {
            ElMessage.error('Delete failed');
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
}
.el-header {
    background-color: #fff;
    border-bottom: 1px solid #dcdfe6;
}
.actions {
    margin-bottom: 20px;
}
</style>
