<template>
  <div class="ai-analysis-container">
    <h1 class="system-title">AI错题分析</h1>

    <!-- 查询表单 -->
    <el-form :inline="true" class="query-form">
      <el-form-item label="考试ID">
        <el-input
          v-model="examId"
          placeholder="请输入考试ID"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item label="最小错误次数">
        <el-input-number
          v-model="minErrorCount"
          :min="1"
          :max="100"
          :step="1"
        ></el-input-number>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="fetchWrongAnswersAnalysis"
          :loading="loading"
        >
          <el-icon>
            <Search />
          </el-icon>
          查询
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 错误提示 -->
    <div v-else-if="error" class="error-state">
      <el-alert :title="error" type="error" :closable="false" show-icon />
    </div>

    <!-- 空数据提示 -->
    <div v-else-if="wrongAnswersAnalysis.length === 0" class="empty-state">
      <el-empty description="暂无错题分析数据" />
    </div>

    <!-- 错题分析表格 -->
    <div v-else class="analysis-table-container">
      <h2>错题分析结果 (共 {{ wrongAnswersAnalysis.length }} 条记录)</h2>

      <!-- AI分析按钮 -->
      <div class="ai-analysis-button-container">
        <el-button
          type="success"
          :icon="Opportunity"
          :disabled="wrongAnswersAnalysis.length === 0"
          :loading="aiAnalysisLoading"
          @click="analyzeWithAI"
        >
          AI智能分析
        </el-button>
      </div>

      <!-- AI分析结果展示区域 -->
      <div v-if="aiAnalysisResult" class="ai-analysis-result">
        <el-card class="ai-result-card">
          <template #header>
            <div class="ai-result-header">
              <el-icon>
                <Opportunity />
              </el-icon>
              <span>AI分析结果</span>
            </div>
          </template>
          <MarkDown v-model:value="formattedAIResult"></MarkDown>
        </el-card>
      </div>

      <el-table
        :data="wrongAnswersAnalysis"
        border
        stripe
        style="width: 100%"
        :default-sort="{ prop: 'error_count', order: 'descending' }"
      >
        <MarkDown v-model:value="wrongAnswersAnalysis"></MarkDown>
        <el-table-column label="题号" width="120" align="center">
          <template #default="scope">
            <span
              class="question-type-badge"
              :class="getTypeClass(scope.row.chinese_number)"
            >
              {{ scope.row.chinese_number }}.{{ scope.row.question_number }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="content" label="题目内容" />

        <el-table-column
          prop="correct_answer"
          label="正确答案"
          width="120"
          align="center"
        />

        <el-table-column
          prop="error_count"
          label="错误次数"
          width="120"
          align="center"
          sortable
        >
          <template #default="scope">
            <el-tag type="danger">{{ scope.row.error_count }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { Search, Opportunity } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { studentApi } from "../api/student";
import { aiApi } from "../api/ai";
import MarkDown from "@/components/MarkDown.vue";

// 响应式状态
const examId = ref("");
const minErrorCount = ref(1);
const wrongAnswersAnalysis = ref([]);
const loading = ref(false);
const error = ref(null);
const aiAnalysisLoading = ref(false);
const aiAnalysisResult = ref(null);

// 计算属性
const formattedAIResult = computed(() => {
  if (!aiAnalysisResult.value) return "";
  return aiAnalysisResult.value;
});

// 获取错题分析数据
const fetchWrongAnswersAnalysis = async () => {
  if (!examId.value) {
    ElMessage.warning("请输入考试ID");
    return;
  }

  loading.value = true;
  error.value = null;
  aiAnalysisResult.value = null;

  try {
    const response = await studentApi.getWrongAnswersAnalysis(
      examId.value,
      minErrorCount.value
    );
    if (response.success) {
      wrongAnswersAnalysis.value = response.data;
      console.log("获取到的错题分析数据:", wrongAnswersAnalysis.value);
    } else {
      throw new Error(response.message || "获取错题分析数据失败");
    }
  } catch (err) {
    console.error("获取错题分析数据失败:", err);
    error.value = err.message || "获取错题分析数据失败，请重试";
  } finally {
    loading.value = false;
  }
};

// 使用AI分析错题数据
const analyzeWithAI = async () => {
  if (wrongAnswersAnalysis.value.length === 0) {
    ElMessage.warning("没有错题数据可供分析");
    return;
  }

  aiAnalysisLoading.value = true;

  try {
    const result = await aiApi.analyzeWrongAnswersWithDeepseekR1(
      wrongAnswersAnalysis.value
    );
    aiAnalysisResult.value = result;
    ElMessage.success("AI分析完成");
  } catch (err) {
    console.error("AI分析失败:", err);
    ElMessage.error("AI分析失败: " + (err.message || "未知错误"));
  } finally {
    aiAnalysisLoading.value = false;
  }
};

// 获取题目类型样式类
const getTypeClass = (chineseNumber) => {
  if (chineseNumber === "一") {
    return "type-choice";
  } else if (chineseNumber === "二") {
    return "type-fill";
  } else if (chineseNumber === "三") {
    return "type-judgment";
  }
  return "";
};
</script>

<style scoped>
.ai-analysis-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.system-title {
  text-align: center;
  color: white;
  background-color: #409eff;
  padding: 15px;
  margin-top: 0;
  border-radius: 4px;
  margin-bottom: 20px;
}

.query-form {
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.loading-state,
.error-state,
.empty-state {
  margin: 40px 0;
}

.analysis-table-container {
  margin-top: 20px;
}

.analysis-table-container h2 {
  margin-bottom: 15px;
  color: #303133;
  font-size: 18px;
}

.question-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  color: white;
  font-weight: bold;
}

.type-choice {
  background-color: #67c23a;
}

.type-fill {
  background-color: #e6a23c;
}

.type-judgment {
  background-color: #f56c6c;
}

.ai-analysis-button-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.ai-analysis-button-container .el-button {
  padding: 12px 25px;
  font-size: 16px;
}

.ai-analysis-result {
  margin: 20px 0;
}

.ai-result-card {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.ai-result-header {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.ai-result-header i {
  margin-right: 8px;
}

.ai-result-content {
  line-height: 1.8;
  color: #303133;
  padding: 10px 0;
}

.ai-result-content h1,
.ai-result-content h2,
.ai-result-content h3 {
  margin-top: 16px;
  margin-bottom: 8px;
  color: #409eff;
}

.ai-result-content ul,
.ai-result-content ol {
  padding-left: 20px;
  margin: 10px 0;
}

.ai-result-content p {
  margin: 10px 0;
}

.el-table .cell {
  word-break: break-word;
  line-height: 1.5;
}
</style>
