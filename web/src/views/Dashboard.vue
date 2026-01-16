<template>
  <el-container class="layout-container">
    <el-header>
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 100%;
        "
      >
        <h3>TJUEcard Dashboard</h3>
        <el-button @click="logout">Logout</el-button>
      </div>
    </el-header>
    <el-main>
      <div class="actions">
        <el-button type="primary" @click="showAddDialog = true"
          >Add Room</el-button
        >
      </div>

      <el-table
        :data="rooms"
        style="width: 100%; margin-top: 20px"
        v-loading="loading"
      >
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
            {{ scope.row.last_electricity ?? "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="notification_threshold" label="Threshold" />
        <el-table-column label="Actions">
          <template #default="scope">
            <el-button
              type="danger"
              size="small"
              @click="deleteRoom(scope.row.room_id)"
              >Delete</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <!-- Add Room Dialog -->
      <el-dialog v-model="showAddDialog" title="Add Room" width="500px">
        <el-form :model="addForm" label-width="120px">
          <el-form-item label="System ID">
            <el-input
              v-model="addForm.system_id"
              placeholder="e.g. systemId"
            ></el-input>
          </el-form-item>
          <el-form-item label="Area ID">
            <el-input
              v-model="addForm.area_id"
              placeholder="e.g. areaId"
            ></el-input>
          </el-form-item>
          <el-form-item label="Building ID">
            <el-input
              v-model="addForm.building_id"
              placeholder="e.g. buildingId"
            ></el-input>
          </el-form-item>
          <el-form-item label="Floor ID">
            <el-input
              v-model="addForm.floor_id"
              placeholder="e.g. floorId"
            ></el-input>
          </el-form-item>
          <el-form-item label="Room ID">
            <el-input
              v-model="addForm.room_id"
              placeholder="e.g. roomId"
            ></el-input>
          </el-form-item>
          <el-form-item label="Alias Name">
            <el-input
              v-model="addForm.alias_name"
              placeholder="My Dorm"
            ></el-input>
          </el-form-item>
          <el-form-item label="Threshold">
            <el-input-number
              v-model="addForm.notification_threshold"
              :min="-1"
            ></el-input-number>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showAddDialog = false">Cancel</el-button>
            <el-button
              type="primary"
              @click="submitAddRoom"
              :loading="submitLoading"
              >Confirm</el-button
            >
          </span>
        </template>
      </el-dialog>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "../api";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";

const router = useRouter();
const rooms = ref([]);
const loading = ref(false);
const showAddDialog = ref(false);
const submitLoading = ref(false);

const addForm = ref({
  system_id: "",
  area_id: "",
  building_id: "",
  floor_id: "",
  room_id: "",
  alias_name: "",
  notification_threshold: -1,
});

const fetchRooms = async () => {
  loading.value = true;
  try {
    const res = await api.get("/rooms");
    rooms.value = res.data;
  } catch (e) {
    ElMessage.error("Failed to load rooms");
  } finally {
    loading.value = false;
  }
};

const submitAddRoom = async () => {
  submitLoading.value = true;
  try {
    await api.post("/rooms", addForm.value);
    ElMessage.success("Room added");
    showAddDialog.value = false;
    fetchRooms();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || "Failed to add room");
  } finally {
    submitLoading.value = false;
  }
};

const deleteRoom = (id: string) => {
  ElMessageBox.confirm("Are you sure to unsubscribe?", "Warning", {
    confirmButtonText: "Yes",
    cancelButtonText: "Cancel",
    type: "warning",
  }).then(async () => {
    try {
      await api.delete(`/rooms/${id}`);
      ElMessage.success("Deleted");
      fetchRooms();
    } catch (e) {
      ElMessage.error("Delete failed");
    }
  });
};

const logout = () => {
  localStorage.removeItem("token");
  router.push("/login");
};

onMounted(() => {
  fetchRooms();
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
