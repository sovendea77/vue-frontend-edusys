<template>
  <div class="wrong-answers-container">
    <h1 class="system-title">学生错题详情</h1>

    <div class="student-info">
      <el-button :icon="ArrowLeft" size="small" @click="goBack">返回</el-button>
      <h2>{{ studentName }} 的错题列表</h2>
    </div>

    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="error" class="error-state">
      <el-alert :title="error" type="error" :closable="false" show-icon />
    </div>

    <div v-else-if="wrongAnswers.length === 0" class="empty-state">
      <el-empty description="该学生没有错题记录" />
    </div>

    <div v-else class="wrong-answers-list">
      <el-card
        v-for="(wrongAnswer, index) in wrongAnswers"
        :key="index"
        class="wrong-answer-card"
      >
        <div class="question-header">
          <span class="question-number"
            >{{ wrongAnswer.chinese_number }}、{{
              wrongAnswer.question_number
            }}.</span
          >
          <span
            class="question-type-badge"
            :class="getTypeClass(wrongAnswer.chinese_number)"
            >{{ getTypeName(wrongAnswer.chinese_number) }}</span
          >
        </div>

        <div class="question-content" v-if="wrongAnswer.content">
          {{ wrongAnswer.content }}
        </div>

        <div class="answers-container">
          <div class="answer-item">
            <span class="answer-label">学生答案:</span>
            <span class="student-answer">{{
              wrongAnswer.student_answer || "未作答"
            }}</span>
          </div>
          <div class="answer-item">
            <span class="answer-label">正确答案:</span>
            <span class="correct-answer">{{ wrongAnswer.correct_answer }}</span>
          </div>

          <div
            v-if="isFillQuestion(wrongAnswer.chinese_number)"
            class="fill-grading-section"
          >
            <div class="grading-buttons">
              <el-button
                type="warning"
                size="small"
                :icon="Edit"
                :loading="wrongAnswer.aiGrading"
                @click="gradeFillWithAI(wrongAnswer)"
              >
                AI批改
              </el-button>

              <el-button
                type="primary"
                size="small"
                :icon="User"
                @click="showManualGradingForFill(wrongAnswer)"
              >
                手动批改
              </el-button>
            </div>

            <div
              v-if="wrongAnswer.aiGradeResult !== undefined"
              class="ai-grade-result"
            >
              <span class="grade-label">AI评判:</span>
              <span
                class="grade-score"
                :class="{
                  correct: wrongAnswer.aiGradeResult === '正确',
                  incorrect: wrongAnswer.aiGradeResult === '错误',
                }"
              >
                {{ wrongAnswer.aiGradeResult }}
              </span>
              <el-button
                type="success"
                size="small"
                @click="
                  saveFillCorrectness(
                    wrongAnswer,
                    wrongAnswer.aiGradeResult === '正确'
                  )
                "
                :disabled="wrongAnswer.gradeSaved"
              >
                {{ wrongAnswer.gradeSaved ? "已保存" : "保存结果" }}
              </el-button>
            </div>

            <div
              v-if="wrongAnswer.manualGradeResult !== undefined"
              class="manual-grade-result"
            >
              <span class="grade-label">教师评判:</span>
              <span
                class="grade-score"
                :class="{
                  correct: wrongAnswer.manualGradeResult === '正确',
                  incorrect: wrongAnswer.manualGradeResult === '错误',
                }"
              >
                {{ wrongAnswer.manualGradeResult }}
              </span>
              <el-button
                type="success"
                size="small"
                @click="
                  saveFillCorrectness(
                    wrongAnswer,
                    wrongAnswer.manualGradeResult === '正确'
                  )
                "
                :disabled="wrongAnswer.gradeSaved"
              >
                {{ wrongAnswer.gradeSaved ? "已保存" : "保存结果" }}
              </el-button>
            </div>
          </div>

          <div
            v-if="isEssayQuestion(wrongAnswer.chinese_number)"
            class="essay-grading-section"
          >
            <div class="grading-buttons">
              <el-button
                type="warning"
                size="small"
                :icon="Edit"
                :loading="wrongAnswer.aiGrading"
                @click="gradeEssayWithAI(wrongAnswer)"
              >
                AI批改
              </el-button>

              <el-button
                type="primary"
                size="small"
                :icon="User"
                @click="showManualGrading(wrongAnswer)"
              >
                手动批改
              </el-button>
            </div>

            <div
              v-if="wrongAnswer.aiGradeResult !== undefined"
              class="ai-grade-result"
            >
              <span class="grade-label">AI评分:</span>
              <span class="grade-score">{{ wrongAnswer.aiGradeResult }}分</span>
              <el-button
                type="success"
                size="small"
                @click="saveEssayGrade(wrongAnswer, wrongAnswer.aiGradeResult)"
                :disabled="wrongAnswer.gradeSaved"
              >
                {{ wrongAnswer.gradeSaved ? "已保存" : "保存评分" }}
              </el-button>
            </div>

            <div
              v-if="wrongAnswer.manualGradeResult !== undefined"
              class="manual-grade-result"
            >
              <span class="grade-label">教师评分:</span>
              <span class="grade-score"
                >{{ wrongAnswer.manualGradeResult }}分</span
              >
              <el-button
                type="success"
                size="small"
                @click="
                  saveEssayGrade(wrongAnswer, wrongAnswer.manualGradeResult)
                "
                :disabled="wrongAnswer.gradeSaved"
              >
                {{ wrongAnswer.gradeSaved ? "已保存" : "保存评分" }}
              </el-button>
            </div>
          </div>

          <div class="ai-analysis-section">
            <el-button
              type="primary"
              size="small"
              :icon="Opportunity"
              :loading="wrongAnswer.aiAnalyzing"
              @click="analyzeWithAI(wrongAnswer)"
            >
              AI分析
            </el-button>

            <div v-if="wrongAnswer.aiAnalysisResult" class="ai-analysis-result">
              <el-card class="ai-result-card">
                <div class="ai-result-content" style="white-space: pre-wrap">
                  <MarkDown
                    v-model:value="wrongAnswer.aiAnalysisResult"
                  ></MarkDown>
                </div>
              </el-card>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <el-dialog
      v-model="manualGradingDialogVisible"
      title="教师手动批改"
      width="500px"
    >
      <div v-if="currentGradingQuestion" class="manual-grading-dialog">
        <div class="question-info">
          <div class="info-item">
            <span class="info-label">题目:</span>
            <span
              >{{ currentGradingQuestion.chinese_number }}、{{
                currentGradingQuestion.question_number
              }}.</span
            >
          </div>

          <div class="info-item" v-if="currentGradingQuestion.content">
            <span class="info-label">题目内容:</span>
            <div class="info-content">{{ currentGradingQuestion.content }}</div>
          </div>

          <div class="info-item">
            <span class="info-label">标准答案:</span>
            <div class="info-content">
              {{ currentGradingQuestion.correct_answer }}
            </div>
          </div>

          <div class="info-item">
            <span class="info-label">学生答案:</span>
            <div class="info-content">
              {{ currentGradingQuestion.student_answer || "未作答" }}
            </div>
          </div>

          <div class="info-item">
            <span class="info-label">总分:</span>
            <span>{{ currentGradingQuestion.score || 10 }}分</span>
          </div>
        </div>

        <div class="score-input">
          <span class="score-label">评分:</span>
          <el-input-number
            v-model="manualScore"
            :min="0"
            :max="currentGradingQuestion.score || 10"
            :step="1"
            size="small"
          />
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="manualGradingDialogVisible = false"
            >取消</el-button
          >
          <el-button type="primary" @click="submitManualGrading"
            >确定</el-button
          >
        </span>
      </template>
    </el-dialog>

    <el-dialog
      v-model="fillManualGradingDialogVisible"
      title="填空题手动批改"
      width="500px"
    >
      <div v-if="currentGradingQuestion" class="manual-grading-dialog">
        <div class="question-info">
          <div class="info-item">
            <span class="info-label">题目:</span>
            <span
              >{{ currentGradingQuestion.chinese_number }}、{{
                currentGradingQuestion.question_number
              }}.</span
            >
          </div>

          <div class="info-item" v-if="currentGradingQuestion.content">
            <span class="info-label">题目内容:</span>
            <div class="info-content">{{ currentGradingQuestion.content }}</div>
          </div>

          <div class="info-item">
            <span class="info-label">标准答案:</span>
            <div class="info-content">
              {{ currentGradingQuestion.correct_answer }}
            </div>
          </div>

          <div class="info-item">
            <span class="info-label">学生答案:</span>
            <div class="info-content">
              {{ currentGradingQuestion.student_answer || "未作答" }}
            </div>
          </div>
        </div>

        <div class="fill-judgment">
          <span class="judgment-label">评判结果:</span>
          <el-radio-group v-model="fillJudgment">
            <el-radio value="正确">正确</el-radio>
            <el-radio value="错误">错误</el-radio>
          </el-radio-group>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="fillManualGradingDialogVisible = false"
            >取消</el-button
          >
          <el-button type="primary" @click="submitFillManualGrading"
            >确定</el-button
          >
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onBeforeMount } from "vue";
import { useRouter, useRoute } from "vue-router";
import { studentApi } from "../api/student";
import { aiApi } from "../api/ai";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowLeft, Edit, User, Opportunity } from "@element-plus/icons-vue";
import MarkDown from "@/components/MarkDown.vue";

// 路由相关
const router = useRouter();
const route = useRoute();

// 响应式状态
const examId = ref(null);
const studentId = ref(null);
const studentName = ref("");
const wrongAnswers = ref([]);
const loading = ref(true);
const error = ref(null);
const manualGradingDialogVisible = ref(false);
const currentGradingQuestion = ref(null);
const manualScore = ref(0);
const fillManualGradingDialogVisible = ref(false);
const fillJudgment = ref("正确");

// 获取学生错题详情
const fetchWrongAnswers = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await studentApi.getStudentWrongAnswers(
      examId.value,
      studentId.value
    );
    if (response.success) {
      wrongAnswers.value = response.data;
      console.log("获取到的错题详情:", wrongAnswers.value);
    } else {
      throw new Error(response.message || "获取错题详情失败");
    }
  } catch (err) {
    console.error("获取错题详情失败:", err);
    error.value = err.message || "获取错题详情失败，请重试";
  } finally {
    loading.value = false;
  }
};

// AI分析
const analyzeWithAI = async (wrongAnswer) => {
  if (wrongAnswer.aiAnalyzing) return;
  wrongAnswer.aiAnalyzing = true;

  try {
    const analysisData = {
      questionType: getTypeName(wrongAnswer.chinese_number),
      questionContent: wrongAnswer.content,
      correctAnswer: wrongAnswer.correct_answer,
      studentAnswer: wrongAnswer.student_answer || "未作答",
    };

    const result = await aiApi.analyzeWrongAnswerWithDeepseekR1(analysisData);
    wrongAnswer.aiAnalysisResult = result;
    ElMessage.success("AI分析完成");
  } catch (err) {
    console.error("AI分析失败:", err);
    ElMessage.error("AI分析失败: " + (err.message || "未知错误"));
  } finally {
    wrongAnswer.aiAnalyzing = false;
  }
};

// 返回上一页
const goBack = () => {
  if (examId.value) {
    router.push({
      path: `/exam/${examId.value}/content`,
    });
  } else {
    router.push("/");
  }
};

// 获取题目类型样式类
const getTypeClass = (chineseNumber) => {
  const wrongAnswer = wrongAnswers.value.find(
    (item) => item.chinese_number === chineseNumber
  );
  if (wrongAnswer?.section_type) {
    const sectionType = wrongAnswer.section_type.toLowerCase();
    if (sectionType === "choice" || sectionType.includes("选择")) {
      return "type-choice";
    } else if (sectionType === "fill" || sectionType.includes("填空")) {
      return "type-fill";
    } else if (sectionType === "judgment" || sectionType.includes("判断")) {
      return "type-judgment";
    } else if (sectionType === "essay" || sectionType.includes("解答")) {
      return "type-essay";
    }
  }
  return "";
};

// 获取题目类型名称
const getTypeName = (chineseNumber) => {
  const wrongAnswer = wrongAnswers.value.find(
    (item) => item.chinese_number === chineseNumber
  );
  if (wrongAnswer?.section_type) {
    const sectionType = wrongAnswer.section_type.toLowerCase();
    if (sectionType === "choice" || sectionType.includes("选择")) {
      return "选择题";
    } else if (sectionType === "fill" || sectionType.includes("填空")) {
      return "填空题";
    } else if (sectionType === "judgment" || sectionType.includes("判断")) {
      return "判断题";
    } else if (sectionType === "essay" || sectionType.includes("解答")) {
      return "解答题";
    }
    return wrongAnswer.section_type;
  }
  return "未知题型";
};

// 显示填空题手动批改对话框
const showManualGradingForFill = (wrongAnswer) => {
  currentGradingQuestion.value = wrongAnswer;
  fillJudgment.value = wrongAnswer.manualGradeResult || "正确";
  fillManualGradingDialogVisible.value = true;
};

// 提交填空题手动批改
const submitFillManualGrading = () => {
  if (!currentGradingQuestion.value) return;

  currentGradingQuestion.value.manualGradeResult = fillJudgment.value;
  currentGradingQuestion.value.gradeSaved = false;

  fillManualGradingDialogVisible.value = false;
  ElMessage.success("教师评判已设置");
};

// 判断是否为解答题
const isEssayQuestion = (chineseNumber) => {
  const wrongAnswer = wrongAnswers.value.find(
    (item) => item.chinese_number === chineseNumber
  );
  if (wrongAnswer?.section_type) {
    const sectionType = wrongAnswer.section_type.toLowerCase();
    return sectionType === "essay" || sectionType.includes("解答");
  }
  return false;
};

// 判断是否为填空题
const isFillQuestion = (chineseNumber) => {
  const wrongAnswer = wrongAnswers.value.find(
    (item) => item.chinese_number === chineseNumber
  );
  if (wrongAnswer?.section_type) {
    const sectionType = wrongAnswer.section_type.toLowerCase();
    return sectionType === "fill" || sectionType.includes("填空");
  }
  return false;
};

// AI批改解答题
const gradeEssayWithAI = async (wrongAnswer) => {
  if (wrongAnswer.aiGrading) return;
  wrongAnswer.aiGrading = true;

  try {
    const gradeData = {
      studentAnswer: wrongAnswer.student_answer || "未作答",
      standardAnswer: wrongAnswer.correct_answer,
      totalScore: wrongAnswer.question_score || wrongAnswer.score || 10,
    };

    const score = await aiApi.gradeEssayQuestionWithDeepseek(gradeData);
    wrongAnswer.aiGradeResult = score;
    wrongAnswer.gradeSaved = false;
    ElMessage.success("AI批改完成");
  } catch (err) {
    console.error("AI批改失败:", err);
    ElMessage.error("AI批改失败: " + (err.message || "未知错误"));
  } finally {
    wrongAnswer.aiGrading = false;
  }
};

// AI批改填空题
const gradeFillWithAI = async (wrongAnswer) => {
  if (wrongAnswer.aiGrading) return;
  wrongAnswer.aiGrading = true;

  try {
    const gradeData = {
      studentAnswer: wrongAnswer.student_answer || "未作答",
      standardAnswer: wrongAnswer.correct_answer,
      questionContent: wrongAnswer.content || "无题目内容",
    };

    const isCorrect = await aiApi.gradeFillQuestionWithDeepseek(gradeData);
    wrongAnswer.aiGradeResult = isCorrect ? "正确" : "错误";
    wrongAnswer.gradeSaved = false;
    ElMessage.success("AI批改完成");
  } catch (err) {
    console.error("AI批改失败:", err);
    ElMessage.error("AI批改失败: " + (err.message || "未知错误"));
  } finally {
    wrongAnswer.aiGrading = false;
  }
};

// 保存填空题正确性
const saveFillCorrectness = async (wrongAnswer, isCorrect) => {
  try {
    const questionId = wrongAnswer.question_id || wrongAnswer.id;

    if (!questionId) {
      console.error("错误: 无法获取题目ID", wrongAnswer);
      ElMessage.error("保存批改结果失败: 无法获取题目ID");
      return;
    }

    console.log("保存填空题正确性 - 使用的questionId:", questionId);

    const response = await studentApi.updateFillQuestionCorrectness(
      examId.value,
      studentId.value,
      questionId,
      isCorrect
    );

    if (response.success) {
      wrongAnswer.gradeSaved = true;
      wrongAnswer.is_corrected = isCorrect;
      ElMessage.success("批改结果已保存到数据库");
    } else {
      throw new Error(response.message || "保存批改结果失败");
    }
  } catch (err) {
    console.error("保存批改结果失败:", err);
    ElMessage.error("保存批改结果失败: " + (err.message || "未知错误"));
  }
};

// 显示手动批改对话框
const showManualGrading = (wrongAnswer) => {
  currentGradingQuestion.value = wrongAnswer;
  manualScore.value = wrongAnswer.manualGradeResult || 0;
  manualGradingDialogVisible.value = true;
};

// 提交手动批改
const submitManualGrading = () => {
  if (!currentGradingQuestion.value) return;

  const totalScore = currentGradingQuestion.value.score || 10;
  if (manualScore.value < 0 || manualScore.value > totalScore) {
    ElMessage.error(`分数必须在0-${totalScore}分之间`);
    return;
  }

  currentGradingQuestion.value.manualGradeResult = manualScore.value;
  currentGradingQuestion.value.gradeSaved = false;

  manualGradingDialogVisible.value = false;
  ElMessage.success("教师评分已设置");
};

// 保存解答题评分
const saveEssayGrade = async (wrongAnswer, score) => {
  try {
    const questionId = wrongAnswer.question_id || wrongAnswer.id;

    if (!questionId) {
      console.error("错误: 无法获取题目ID", wrongAnswer);
      ElMessage.error("保存评分失败: 无法获取题目ID");
      return;
    }

    console.log("保存评分 - 使用的questionId:", questionId);

    const response = await studentApi.updateEssayQuestionScore(
      examId.value,
      studentId.value,
      questionId,
      score
    );

    if (response.success) {
      wrongAnswer.gradeSaved = true;
      wrongAnswer.score = score;
      ElMessage.success("评分已保存到数据库");
    } else {
      throw new Error(response.message || "保存评分失败");
    }
  } catch (err) {
    console.error("保存评分失败:", err);
    ElMessage.error("保存评分失败: " + (err.message || "未知错误"));
  }
};

// 生命周期钩子
onBeforeMount(() => {
  // 从路由参数获取考试ID和学生ID
  examId.value = route.params.examId;
  studentId.value = route.params.studentId;
  studentName.value = route.params.studentName || studentId.value;

  if (!examId.value || !studentId.value) {
    error.value = "缺少必要参数";
    loading.value = false;
    return;
  }

  // 获取错题详情
  fetchWrongAnswers();
});
</script>

<style scoped>
.wrong-answers-container {
  max-width: 900px;
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
}

.student-info {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.student-info h2 {
  margin-left: 15px;
  flex-grow: 1;
}

.loading-state,
.error-state,
.empty-state {
  margin-top: 40px;
  text-align: center;
}

.wrong-answers-list {
  margin-top: 20px;
}

.wrong-answer-card {
  margin-bottom: 15px;
}

.question-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.question-number {
  font-weight: bold;
  font-size: 16px;
  margin-right: 10px;
}

.question-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  color: white;
  font-size: 12px;
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

.type-essay {
  background-color: #409eff;
}

.question-content {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.answers-container {
  display: flex;
  flex-direction: column;
}

.answer-item {
  margin-bottom: 10px;
}

.answer-label {
  font-weight: bold;
  margin-right: 10px;
}

.student-answer {
  color: #f56c6c;
}

.correct-answer {
  color: #67c23a;
}

/* 添加新样式 */
.ai-analysis-section {
  margin-top: 15px;
  border-top: 1px solid #ebeef5;
  padding-top: 15px;
}

.ai-analysis-result {
  margin-top: 10px;
}

.ai-result-card {
  background-color: #f8f9fa;
}

.ai-result-content {
  padding: 10px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

/* 解答题样式 */
.essay-answer-container {
  width: 100%;
}

.essay-answer {
  margin-top: 5px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  line-height: 1.6;
  width: 100%;
}

.essay-grading-section {
  margin-top: 10px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.ai-grade-result {
  margin-top: 8px;
  padding: 8px;
  background-color: #f8f8f8;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.grade-label {
  font-weight: bold;
  margin-right: 8px;
}

.grade-score {
  color: #e6a23c;
  font-size: 16px;
  font-weight: bold;
  margin-right: 15px;
}

.grading-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.manual-grade-result {
  margin-top: 8px;
  padding: 8px;
  background-color: #ecf5ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.manual-grading-dialog {
  padding: 10px;
}

.question-info {
  margin-bottom: 20px;
}

.info-item {
  margin-bottom: 10px;
}

.info-label {
  font-weight: bold;
  margin-right: 8px;
  color: #606266;
}

.info-content {
  margin-top: 5px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  white-space: pre-wrap;
}

.score-input {
  display: flex;
  align-items: center;
  margin-top: 15px;
}

.score-label {
  font-weight: bold;
  margin-right: 15px;
  color: #606266;
}

.fill-grading-section {
  margin-top: 10px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.fill-judgment {
  margin-top: 15px;
}

.judgment-label {
  margin-right: 10px;
  font-weight: bold;
}

.correct {
  color: #67c23a;
  font-weight: bold;
}

.incorrect {
  color: #f56c6c;
  font-weight: bold;
}
</style>
