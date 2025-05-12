<template>
  <div class="exam-content-container">
    <h1 class="system-title">多模态试卷自动勘误辅导系统</h1>

    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="error" class="error-state">
      <el-alert
        :title="error"
        type="error"
        :closable="false"
        show-icon
      ></el-alert>
    </div>

    <div v-else-if="!latestExam" class="empty-state">
      <el-empty description="暂无考试记录"></el-empty>
      <el-button type="primary" @click="createNewExam" class="create-exam-btn"
        >创建新考试</el-button
      >
    </div>

    <div v-else class="answer-definition-section">
      <div class="exam-info">
        <h2><br />{{ latestExam.title || "考试名称" }}</h2>
        <p v-if="latestExam.description">{{ latestExam.description }}</p>
        <p class="exam-date">
          创建时间: {{ formatDate(latestExam.created_at) }}
        </p>
      </div>

      <div class="student-info">
        <el-button :icon="Back" size="small" @click="goBack">返回</el-button>
      </div>

      <!-- 题目类型列表 -->
      <div class="question-sections">
        <el-card
          v-for="(section, sectionIndex) in questionSections"
          :key="sectionIndex"
          class="question-section-card"
        >
          <div class="section-header">
            <div class="section-type-badge" :class="getTypeClass(section.type)">
              {{
                section.chineseNumber || getChineseNumber(sectionIndex + 1)
              }}、{{ getTypeName(section.type) }}
              <span class="section-score">{{ section.score }}分</span>
            </div>

            <div class="questions-container">
              <div
                v-for="(question, qIndex) in section.questions"
                :key="qIndex"
                class="question-item"
                :class="{ 'essay-question-item': section.type === 'essay' }"
              >
                {{ section.startNum + qIndex }}.
                <!-- 解答题使用多行文本框 -->
                <el-input
                  v-if="section.type === 'essay'"
                  v-model="question.answer"
                  :placeholder="getPlaceholder(section.type)"
                  type="textarea"
                  :rows="4"
                  resize="none"
                  class="essay-input"
                  :disabled="!isEditing"
                ></el-input>

                <!-- 其他题型使用普通输入框 -->
                <el-input
                  v-else-if="section.type !== 'judgment'"
                  v-model="question.answer"
                  :placeholder="getPlaceholder(section.type)"
                  class="answer-input"
                  :size="'small'"
                  :disabled="!isEditing"
                ></el-input>

                <!-- 判断题使用下拉选择框 -->
                <el-select
                  v-if="section.type === 'judgment'"
                  v-model="question.answer"
                  placeholder=""
                  :size="'small'"
                  class="judgment-select"
                  :disabled="!isEditing"
                >
                  <el-option label="对" value="对"></el-option>
                  <el-option label="错" value="错"></el-option>
                </el-select>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button v-if="!isEditing" type="primary" @click="startEditing"
          >编辑答案</el-button
        >
        <template v-else>
          <el-button type="success" @click="saveAnswers" :loading="saving"
            >保存答案</el-button
          >
          <el-button @click="cancelEditing">取消</el-button>
        </template>

        <!-- 上传试卷按钮 -->
        <div class="upload-tip">
          <el-button type="primary" :size="'small'" @click="showUploadDialog"
            >上传源试卷图片以获得题目内容</el-button
          >
        </div>
      </div>

      <!-- 上传试卷对话框 -->
      <el-dialog title="上传试卷图片" v-model="uploadDialogVisible" width="40%">
        <div class="upload-container">
          <el-upload
            class="upload-area"
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="fList"
            multiple
            list-type="picture-card"
            :limit="10"
          >
            <el-icon><Plus /></el-icon>
            <template #tip>
              <div class="el-upload__tip">
                支持上传jpg/png格式的图片，每张不超过5MB
              </div>
            </template>
          </el-upload>
        </div>

        <template #footer>
          <span class="dialog-footer">
            <el-button @click="uploadDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="processUpload"
              >处理图片</el-button
            >
          </span>
        </template>
      </el-dialog>

      <!-- 学生试卷上传对话框 -->
      <el-dialog
        title="上传学生试卷"
        v-model="studentUploadDialogVisible"
        width="50%"
      >
        <div class="upload-container">
          <el-upload
            class="upload-area"
            action="#"
            :auto-upload="false"
            :on-change="handleStudentFileChange"
            :on-remove="handleStudentFileRemove"
            :file-list="studentFileList"
            multiple
            list-type="picture-card"
            :limit="30"
          >
            <el-icon><Plus /></el-icon>
            <template #tip>
              <div class="el-upload__tip">
                支持上传jpg/png格式的图片，每张不超过5MB，文件名需包含学生姓名
              </div>
            </template>
          </el-upload>

          <div
            class="file-prefixes-container"
            v-if="studentFileList.length > 0"
          >
            <p>检测到的学生姓名：</p>
            <div>
              <el-tag
                v-for="(name, index) in detectedStudentNames"
                :key="index"
                class="file-prefix-tag"
                type="success"
              >
                {{ name }}
              </el-tag>
              <el-tag v-if="detectedStudentNames.length === 0" type="info"
                >未检测到学生姓名</el-tag
              >
            </div>
          </div>
        </div>

        <template #footer>
          <span class="dialog-footer">
            <el-button @click="studentUploadDialogVisible = false"
              >取消</el-button
            >
            <el-button
              type="primary"
              @click="processStudentPapers"
              :loading="processingStudentPapers"
              >批量批改</el-button
            >
          </span>
        </template>
      </el-dialog>

      <!-- 考试统计信息 -->
      <div class="statistics-section" v-if="latestExam">
        <h3>考试统计信息</h3>

        <div v-if="examStatistics.studentCount > 0" class="statistics-content">
          <div class="statistics-item">
            <span class="statistics-label">参考人数</span>
            <span class="statistics-value">{{
              examStatistics.studentCount
            }}</span>
          </div>

          <div class="statistics-item">
            <span class="statistics-label">平均分</span>
            <span class="statistics-value">{{
              examStatistics.averageScore
            }}</span>
          </div>

          <div class="statistics-item">
            <span class="statistics-label">最高分</span>
            <span class="statistics-value">{{
              examStatistics.highestScore
            }}</span>
            <span class="statistics-student">{{
              examStatistics.highestScoreStudent
            }}</span>
          </div>

          <div class="statistics-item">
            <span class="statistics-label">最低分</span>
            <span class="statistics-value">{{
              examStatistics.lowestScore
            }}</span>
          </div>
        </div>

        <div v-else class="empty-statistics">
          <el-empty description="暂无学生成绩数据"></el-empty>
        </div>

        <!-- AI分析按钮 -->
        <div v-if="examStatistics.studentCount > 0" class="ai-analysis-button">
          <el-button
            type="primary"
            @click="analyzeExamStatistics"
            :loading="aiAnalysisLoading"
            >AI分析考试成绩</el-button
          >
        </div>
      </div>

      <!-- AI分析结果 -->
      <div v-if="showAiAnalysis" class="ai-analysis-section">
        <h3>AI分析结果</h3>
        <el-card class="ai-analysis-card">
          <div class="ai-analysis-content">{{ aiAnalysisResult }}</div>
        </el-card>
      </div>

      <!-- 学生列表 -->
      <div class="student-list-section" v-if="studentList.length > 0">
        <h3 class="student-list-title">学生成绩列表</h3>

        <el-table
          :data="studentList"
          style="width: 100%"
          :border="true"
          v-loading="studentListLoading"
        >
          <el-table-column prop="student_name" label="学生姓名" width="120">
          </el-table-column>
          <el-table-column prop="score" label="总分" width="80">
          </el-table-column>
          <el-table-column label="操作">
            <template #default="scope">
              <el-button
                :size="'small'"
                type="primary"
                @click="viewStudentWrongAnswers(scope.row)"
              >
                查看错题
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="statistics-actions">
        <el-button
          type="primary"
          :size="'small'"
          @click="studentUploadDialogVisible = true"
          >上传学生试卷</el-button
        >
        <el-button :size="'small'" @click="updateExamStatistics"
          >更新统计信息</el-button
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeMount } from "vue";
import { useRouter, useRoute } from "vue-router";
import { examApi } from "../api/exam";
import { studentApi } from "../api/student";
import { ElMessage, ElMessageBox, ElLoading, ElSkeleton } from "element-plus";
import { Back, Plus, Loading } from "@element-plus/icons-vue";
import { useClipboard } from "@vueuse/core";
import axios from "axios";
import { useUserStore } from "../stores/user";

// store
const userStore = useUserStore();

// 路由相关
const router = useRouter();
const route = useRoute();
const { copy } = useClipboard();

// 响应式状态
const loading = ref(true);
const error = ref(null);
const latestExam = ref(null);
const questionSections = ref([]);
const originalSections = ref([]);
const isEditing = ref(false);
const saving = ref(false);

// 上传相关
const uploadDialogVisible = ref(false);
const fList = ref([]);
const questionContentDialogVisible = ref(false);
const questionContent = ref("");

// 学生试卷上传相关
const studentUploadDialogVisible = ref(false);
const studentFileList = ref([]);
const detectedStudentNames = ref([]);
const processingStudentPapers = ref(false);

// 统计信息相关
const examStatistics = reactive({
  studentCount: 0,
  averageScore: 0,
  highestScore: 0,
  highestScoreStudent: "",
  lowestScore: 0,
  totalScore: 0,
});

// AI分析相关
const aiAnalysisLoading = ref(false);
const aiAnalysisResult = ref("");
const showAiAnalysis = ref(false);

// 学生列表相关
const studentList = ref([]);
const studentListLoading = ref(false);

// 返回上一页
const goBack = () => {
  router.go(-1);
};

// 创建新考试
const createNewExam = () => {
  router.push("/create-exam");
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

// 获取中文数字
const getChineseNumber = (num) => {
  const chineseNumbers = [
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
    "七",
    "八",
    "九",
    "十",
  ];
  if (num <= 0 || num > 99) return num;
  if (num <= 10) return chineseNumbers[num - 1];

  const tens = Math.floor(num / 10);
  const ones = num % 10;

  if (tens === 1) {
    return ones === 0 ? "十" : `十${chineseNumbers[ones - 1]}`;
  }

  return ones === 0
    ? `${chineseNumbers[tens - 1]}十`
    : `${chineseNumbers[tens - 1]}十${chineseNumbers[ones - 1]}`;
};

// 获取题型名称
const getTypeName = (type) => {
  const typeMap = {
    choice: "选择题",
    fill: "填空题",
    judgment: "判断题",
    essay: "解答题",
  };
  return typeMap[type] || "未知题型";
};

// 获取题型样式类
const getTypeClass = (type) => {
  return `type-${type}`;
};

// 获取占位符文本
const getPlaceholder = (type) => {
  const placeholderMap = {
    choice: "请输入选项（如：A）",
    fill: "请输入答案",
    judgment: "请选择（对/错）",
    essay: "请输入解答过程",
  };
  return placeholderMap[type] || "请输入答案";
};

// 开始编辑
const startEditing = () => {
  isEditing.value = true;
};

// 取消编辑
const cancelEditing = () => {
  // 恢复原始数据
  questionSections.value = JSON.parse(JSON.stringify(originalSections.value));
  isEditing.value = false;
};

// 保存答案
const saveAnswers = async () => {
  if (!latestExam.value) return;

  saving.value = true;

  try {
    // 为每个题型区域添加中文题号
    const sectionsToSave = JSON.parse(JSON.stringify(questionSections.value));
    sectionsToSave.forEach((section, index) => {
      // 使用getChineseNumber方法获取中文题号
      section.chineseNumber = getChineseNumber(index + 1);
      // 确保section_type字段存在
      section.section_type = section.type;

      // 确保每个题目都有content字段，即使为空
      section.questions.forEach((question) => {
        if (!question.content) {
          question.content = null;
        }
      });
    });

    const response = await examApi.saveAnswers(
      latestExam.value.id,
      sectionsToSave
    );

    if (response.data.success) {
      ElMessage.success("答案保存成功");
      // 更新原始数据
      originalSections.value = JSON.parse(
        JSON.stringify(questionSections.value)
      );
      isEditing.value = false;
      // 清空学生列表和统计信息
      studentList.value = [];
      examStatistics.studentCount = 0;
      examStatistics.averageScore = 0;
      examStatistics.highestScore = 0;
      examStatistics.highestScoreStudent = "";
      examStatistics.lowestScore = 0;
      examStatistics.totalScore = 0;

      // 隐藏AI分析结果
      showAiAnalysis.value = false;
      aiAnalysisResult.value = "";

      ElMessage.info("由于题目内容已更新，学生答案数据已清空");
    } else {
      throw new Error(response.data.message || "保存答案失败");
    }
  } catch (error) {
    console.error("保存答案失败:", error);
    ElMessage.error(error.message || "保存答案失败，请重试");
  } finally {
    saving.value = false;
  }
};

// 显示上传对话框
const showUploadDialog = () => {
  uploadDialogVisible.value = true;
  fList.value = [];
};

// 处理文件变更
const handleFileChange = (file, fileList) => {
  // 验证文件类型
  const isJPG = file.raw.type === "image/jpeg";
  const isPNG = file.raw.type === "image/png";
  const isLt5M = file.size / 1024 / 1024 < 5;

  if (!isJPG && !isPNG) {
    ElMessage.error("上传图片只能是 JPG 或 PNG 格式!");
    fList.value = fileList.filter((f) => f.uid !== file.uid);
    return false;
  }

  if (!isLt5M) {
    ElMessage.error("上传图片大小不能超过 5MB!");
    fList.value = fileList.filter((f) => f.uid !== file.uid);
    return false;
  }

  fList.value = fileList;
  return true;
};

// 处理文件移除
const handleFileRemove = (file, fileList) => {
  fList.value = fileList;
};

// 处理学生文件变更
const handleStudentFileChange = (file, fileList) => {
  // 验证文件类型
  const isJPG = file.raw.type === "image/jpeg";
  const isPNG = file.raw.type === "image/png";
  const isLt5M = file.size / 1024 / 1024 < 5;

  if (!isJPG && !isPNG) {
    ElMessage.error("上传图片只能是 JPG 或 PNG 格式!");
    studentFileList.value = fileList.filter((f) => f.uid !== file.uid);
    return false;
  }

  if (!isLt5M) {
    ElMessage.error("上传图片大小不能超过 5MB!");
    studentFileList.value = fileList.filter((f) => f.uid !== file.uid);
    return false;
  }

  studentFileList.value = fileList;

  // 从文件名中提取学生姓名
  detectStudentNames();

  return true;
};

// 处理学生文件移除
const handleStudentFileRemove = (file, fileList) => {
  studentFileList.value = fileList;

  // 重新检测学生姓名
  detectStudentNames();
};

// 从文件名中检测学生姓名
const detectStudentNames = () => {
  if (studentFileList.value.length === 0) {
    detectedStudentNames.value = [];
    return;
  }

  // 提取所有文件名（不含扩展名）
  const fileNames = studentFileList.value.map((file) => {
    const fileName = file.name;
    const dotIndex = fileName.lastIndexOf(".");
    return dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
  });

  // 分析文件名，提取学生姓名或试卷类型
  const nameMap = new Map();

  // 第一步：提取每个文件名中可能的学生姓名或试卷类型
  fileNames.forEach((fileName) => {
    // 尝试匹配常见的模式
    // 1. 数字+学科+卷型 (如 23数学乙卷1)
    const subjectMatch = fileName.match(/^(\d+[^\d]+卷)[^\d]*\d*$/);
    if (subjectMatch) {
      const key = subjectMatch[1];
      if (!nameMap.has(key)) nameMap.set(key, []);
      nameMap.get(key).push(fileName);
      return;
    }

    // 2. 处理带数字后缀的名字 (如 林建华1, 林建华2)
    const nameWithNumberMatch = fileName.match(/^([^\d]+)(\d+)$/);
    if (nameWithNumberMatch) {
      const name = nameWithNumberMatch[1];
      if (!nameMap.has(name)) nameMap.set(name, []);
      nameMap.get(name).push(fileName);
      return;
    }

    // 3. 处理前缀+名字 (如 xx林建华, jj林建华)
    // 查找两个文件名之间的共同部分
    for (const otherName of fileNames) {
      if (fileName === otherName) continue;

      // 寻找最长公共子串
      const commonPart = findLongestCommonSubstring(fileName, otherName);
      if (commonPart && commonPart.length >= 2) {
        // 至少2个字符才认为是有效的名字
        if (!nameMap.has(commonPart)) nameMap.set(commonPart, []);
        if (!nameMap.get(commonPart).includes(fileName)) {
          nameMap.get(commonPart).push(fileName);
        }
        break;
      }
    }

    // 4. 如果没有匹配到任何模式，使用整个文件名
    if (!Array.from(nameMap.values()).some((arr) => arr.includes(fileName))) {
      if (!nameMap.has(fileName)) nameMap.set(fileName, []);
      nameMap.get(fileName).push(fileName);
    }
  });

  // 转换为数组
  detectedStudentNames.value = Array.from(nameMap.keys());
};

// 查找两个字符串的最长公共子串
const findLongestCommonSubstring = (str1, str2) => {
  if (!str1 || !str2) return "";

  let longest = "";
  let matrix = Array(str1.length + 1)
    .fill()
    .map(() => Array(str2.length + 1).fill(0));

  // 填充矩阵
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
        if (matrix[i][j] > longest.length) {
          longest = str1.substring(i - matrix[i][j], i);
        }
      }
    }
  }

  return longest;
};

// 处理上传图片
const processUpload = async () => {
  if (fList.value.length === 0) {
    ElMessage.warning("请先上传试卷扫描件");
    return;
  }

  // 显示加载中提示
  const loadingInstance = ElLoading.service({
    lock: true,
    text: "AI正在处理图片，请稍候...",
    background: "rgba(0, 0, 0, 0.7)",
  });

  try {
    // 获取上传的图片文件
    const imageFiles = fList.value.map((file) => file.raw);

    // 调用仅使用doubao模型的处理方法
    const result = await processImagesWithDoubaoOnly(imageFiles);

    // 关闭对话框
    uploadDialogVisible.value = false;

    // 处理AI返回的结果
    console.log("AI识别结果:", result.originalRecognition);

    // 解析AI返回的结果并提取题目内容
    try {
      // 获取AI返回的结果
      const aiResult = result.originalRecognition;
      console.log("正在处理AI返回结果:", aiResult);

      // 分割成行并过滤空行
      const lines = aiResult.split("\n").filter((line) => line.trim() !== "");

      // 识别题型部分，但不会覆盖原有的中文题号设置
      const match = aiResult.match(/^([一二三四五六七八九十]{1,2})[、.．:：]/);
      // 仅用于识别上传试卷中的题目，不会修改原有题号
      let currentChineseNumber = match ? match[1] : "一"; // 默认为第一大题

      // 存储题目内容的映射
      const questionContents = new Map();

      // 简化的正则表达式，只匹配中文题号
      const sectionPattern = /^([一二三四五六七八九十]{1,2})[、.．:：]/;

      // 改进的正则表达式，匹配数字题号和题目内容，支持以数字开头的题目内容和缩进的选项
      const questionPattern =
        /^\s*(\d+)\s*[.．、:：]\s*([\s\S]*?)(?=\s*(?:(?:^\s*\d+\s*[.．、:：])|$))/gm;

      // 处理题目内容提取的函数
      function extractQuestionContent(line) {
        questionPattern.lastIndex = 0; // 重置正则表达式的lastIndex
        const match = questionPattern.exec(line);
        if (match) {
          return {
            number: parseInt(match[1], 10),
            content: match[2].trim(),
          };
        }
        return null;
      }

      // 处理多行题目内容，包括缩进的选项
      function processMultilineContent(lines, startIndex) {
        let content = lines[startIndex];
        let i = startIndex + 1;

        // 继续添加后续行，直到遇到下一个题号
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          // 如果下一行是新题目（匹配数字题号），则停止
          if (nextLine.match(/^\s*\d+\s*[.．、:：]/)) {
            break;
          }
          // 如果下一行是新大题（匹配中文题号），则停止
          if (nextLine.match(sectionPattern)) {
            break;
          }
          // 否则，将该行添加到当前题目内容中
          content += "\n" + nextLine;
          i++;
        }

        return {
          content: content,
          nextIndex: i,
        };
      }

      console.log("使用的中文题号匹配正则:", sectionPattern);
      console.log("使用的数字题号匹配正则:", questionPattern);

      // 将文本按大题分段
      let sections = [];
      let currentSection = "";
      let currentQuestions = [];

      // 处理每一行文本
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const sectionMatch = line.match(sectionPattern);

        if (sectionMatch) {
          // 如果已经有内容，保存当前section
          if (currentSection && currentChineseNumber) {
            sections.push({
              chineseNumber: currentChineseNumber,
              questions: currentQuestions,
            });
          }

          // 开始新的section，只关注中文题号
          currentChineseNumber = sectionMatch[1];
          currentSection = line + "\n";
          currentQuestions = [];
          console.log(`识别到中文题号: ${currentChineseNumber}`);
        } else {
          // 将行添加到当前section
          currentSection += line + "\n";

          // 尝试匹配小题
          const questionObj = extractQuestionContent(line);
          if (questionObj) {
            // 处理多行内容，包括缩进的选项
            const multilineResult = processMultilineContent(lines, i);
            // 更新题目内容，包含选项
            questionObj.content = multilineResult.content;
            // 更新索引，跳过已处理的行
            i = multilineResult.nextIndex - 1;

            currentQuestions.push(questionObj);
          }
        }
      }

      // 保存最后一个section
      if (currentSection && currentChineseNumber) {
        sections.push({
          chineseNumber: currentChineseNumber,
          questions: currentQuestions,
        });
      }

      // 更新现有题目的content字段
      if (questionSections.value.length > 0 && sections.length > 0) {
        // 记录更新的题目数量
        let updatedQuestionCount = 0;

        // 遍历每个section，只根据中文题号和数字题号匹配更新内容
        sections.forEach((section) => {
          // 在questionSections中找到对应的section，只使用中文题号进行匹配
          const targetSectionIndex = questionSections.value.findIndex((qs) => {
            // 优先使用section自身的chineseNumber属性进行匹配
            return qs.chineseNumber === section.chineseNumber;
          });

          if (targetSectionIndex !== -1) {
            const targetSection = questionSections.value[targetSectionIndex];

            // 遍历section中的每个题目
            section.questions.forEach((extractedQuestion) => {
              // 在targetSection中找到对应题号的题目
              const questionIndex =
                extractedQuestion.number - targetSection.startNum;
              if (
                questionIndex >= 0 &&
                questionIndex < targetSection.questions.length
              ) {
                // 更新题目内容
                targetSection.questions[questionIndex].content =
                  extractedQuestion.content;
                updatedQuestionCount++;
                console.log(
                  `更新题目内容: 中文题号=${section.chineseNumber}, 题号=${extractedQuestion.number}, 内容="${extractedQuestion.content}"`
                );
              }
            });
          }
        });

        // 显示更新的题目数量
        console.log(`共更新了 ${updatedQuestionCount} 道题目的内容`);

        // 如果没有更新任何题目，给出提示
        if (updatedQuestionCount === 0) {
          console.warn("未能更新任何题目内容，可能是题型或题号匹配失败");
          ElMessage.warning("未能自动提取题目内容，请检查题型和题号是否匹配");
        }

        // 自动保存题目内容到数据库
        console.log("正在自动保存题目内容到数据库...");

        // 准备保存题目内容，但不修改中文题号
        const sectionsToSave = JSON.parse(
          JSON.stringify(questionSections.value)
        );
        sectionsToSave.forEach((section, index) => {
          // 保留原有的中文题号，不进行修改
          // 确保section_type字段存在
          section.section_type = section.type;

          // 确保每个题目都有content字段，即使为空
          section.questions.forEach((question) => {
            if (!question.content) {
              question.content = null;
            }
          });
        });

        // 在控制台输出保存的题目内容
        console.log("保存的题目内容:", sectionsToSave);

        // 调用API保存到数据库
        const response = await examApi.saveAnswers(
          latestExam.value.id,
          sectionsToSave
        );
        if (response.data.success) {
          ElMessage.success("题目内容已自动保存到数据库");
          // 更新原始数据
          originalSections.value = JSON.parse(
            JSON.stringify(questionSections.value)
          );
          // 清空学生列表和统计信息
          studentList.value = [];
          examStatistics.studentCount = 0;
          examStatistics.averageScore = 0;
          examStatistics.highestScore = 0;
          examStatistics.highestScoreStudent = "";
          examStatistics.lowestScore = 0;
          examStatistics.totalScore = 0;

          // 隐藏AI分析结果
          showAiAnalysis.value = false;
          aiAnalysisResult.value = "";

          ElMessage.info("由于题目内容已更新，学生答案数据已清空");
        } else {
          throw new Error(response.data.message || "保存题目内容失败");
        }

        ElMessage.success("已提取题目内容");
      } else {
        ElMessage.warning("未能提取题目内容");
      }
    } catch (error) {
      console.error("解析AI结果失败:", error);
      ElMessage.warning("无法自动提取题目内容，请手动编辑");
    }
  } catch (error) {
    console.error("AI处理失败:", error);
    ElMessage.error("AI处理失败，请重试");
  } finally {
    loadingInstance.close();
  }
};

// 仅使用doubao模型处理图片
const processImagesWithDoubaoOnly = async (imageFiles) => {
  try {
    // 导入AI API
    const { aiApi } = await import("../api/ai");

    // 1. 将所有图片转换为Base64格式
    const base64ImagesPromises = imageFiles.map((file) =>
      aiApi.convertImageToBase64(file)
    );
    const base64Images = await Promise.all(base64ImagesPromises);

    // 2. 调用doubao模型识别图片内容
    const doubaoResult = await aiApi.processImagesWithDoubao(base64Images);
    const recognizedContent = doubaoResult.choices[0].message.content;

    return {
      originalRecognition: recognizedContent,
      // 为了保持接口一致，这里直接使用原始识别结果
      optimizedResult: recognizedContent,
    };
  } catch (error) {
    console.error("AI处理图片失败:", error);
    throw error;
  }
};

// 处理学生试卷
const processStudentPapers = async () => {
  if (studentFileList.value.length === 0) {
    ElMessage.warning("请先上传学生试卷");
    return;
  }

  if (detectedStudentNames.value.length === 0) {
    ElMessage.warning("未检测到学生姓名，请确保文件名包含学生姓名");
    return;
  }

  processingStudentPapers.value = true;

  try {
    // 导入AI API
    const { aiApi } = await import("../api/ai");

    // 按学生分组处理图片
    await processImagesByStudent(
      studentFileList.value,
      detectedStudentNames.value,
      aiApi
    );

    // 关闭对话框
    studentUploadDialogVisible.value = false;

    // 更新统计信息
    await updateExamStatistics();

    ElMessage.success(
      `已成功处理 ${studentFileList.value.length} 张学生试卷图片，共 ${detectedStudentNames.value.length} 名学生`
    );
  } catch (error) {
    console.error("处理学生试卷失败:", error);
    ElMessage.error("处理学生试卷失败，请重试");
  } finally {
    processingStudentPapers.value = false;
  }
};

// 按学生分组处理图片
const processImagesByStudent = async (files, studentNames, aiApi) => {
  try {
    // 创建学生文件映射
    const studentFilesMap = new Map();

    // 遍历所有文件，按学生名字分组
    files.forEach((file) => {
      const fileName = file.name;
      const dotIndex = fileName.lastIndexOf(".");
      const fileNameWithoutExt =
        dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;

      // 查找该文件属于哪个学生
      for (const studentName of studentNames) {
        if (
          fileNameWithoutExt.includes(studentName) ||
          studentName.includes(fileNameWithoutExt)
        ) {
          if (!studentFilesMap.has(studentName)) {
            studentFilesMap.set(studentName, []);
          }
          studentFilesMap.get(studentName).push(file.raw);
          break;
        }
      }
    });

    console.log(
      "学生试卷分组情况:",
      Array.from(studentFilesMap.entries()).map(
        ([name, files]) => `${name}: ${files.length}张图片`
      )
    );

    // 依次处理每个学生的图片
    for (const [studentName, imageFiles] of studentFilesMap.entries()) {
      console.log(
        `正在处理学生 ${studentName} 的试卷，共 ${imageFiles.length} 张图片...`
      );

      // 调用专门处理学生试卷的doubao模型
      const result = await aiApi.processStudentPaperWithDoubao(imageFiles);

      // 在控制台打印结果
      console.log(
        `学生 ${studentName} 的试卷处理结果:`,
        result.originalRecognition
      );

      // 解析学生答案
      const studentAnswers = parseStudentAnswers(result.originalRecognition);
      console.log(`解析后的学生答案:`, studentAnswers);

      // 如果有答案，进行批改并保存到数据库
      if (studentAnswers.length > 0) {
        try {
          // 获取标准答案
          const standardAnswers = getStandardAnswers();

          // 使用AI批改学生试卷
          const batchGradeData = {
            standardAnswers,
            studentAnswers,
          };

          // 调用批量批改接口
          const gradeResults = await aiApi.batchGradeStudentPaper(
            batchGradeData
          );
          console.log(`学生 ${studentName} 的批改结果:`, gradeResults);

          // 生成学生ID（使用学生名字作为临时ID）
          const studentId = generateStudentId(studentName);

          // 保存学生答案和批改结果
          const saveResult = await saveStudentAnswersWithGrades(
            latestExam.value.id,
            studentId,
            studentName,
            gradeResults
          );
          console.log(
            `学生 ${studentName} 的答案和批改结果保存结果:`,
            saveResult
          );
        } catch (error) {
          console.error(`批改和保存学生 ${studentName} 的答案失败:`, error);
        }
      }
    }
  } catch (error) {
    console.error("按学生分组处理图片失败:", error);
    throw error;
  }
};

// 获取标准答案
const getStandardAnswers = () => {
  const standardAnswers = [];

  // 遍历所有题型区域
  questionSections.value.forEach((section, sectionIndex) => {
    const chineseNumber =
      section.chineseNumber || getChineseNumber(sectionIndex + 1);

    // 遍历该区域的所有题目
    section.questions.forEach((question, questionIndex) => {
      const questionNumber = section.startNum + questionIndex;

      standardAnswers.push({
        chineseNumber,
        questionNumber,
        answer: question.answer,
        content: question.content,
        type: section.type,
        score: section.score,
      });
    });
  });

  return standardAnswers;
};

// 解析学生答案
const parseStudentAnswers = (recognizedText) => {
  if (!recognizedText) return [];

  // 分割成行并过滤空行
  const lines = recognizedText.split("\n").filter((line) => line.trim() !== "");

  // 存储解析后的答案
  const parsedAnswers = [];

  // 匹配中文题号、数字题号和答案的正则表达式
  // 例如：一、1.A 或 二、2.null
  const answerPattern =
    /^([一二三四五六七八九十]{1,2})[、.．:：]\s*(\d+)[.．、:：]\s*(.+)$/;

  // 处理每一行
  for (const line of lines) {
    const match = line.match(answerPattern);
    if (match) {
      console.log(match);
      const chineseNumber = match[1]; // 中文题号
      const questionNumber = parseInt(match[2], 10); // 数字题号
      const studentAnswer = match[3].trim(); // 学生答案

      parsedAnswers.push({
        chineseNumber,
        questionNumber,
        studentAnswer,
      });
    }
  }

  return parsedAnswers;
};

// 直接使用学生名字作为ID
const generateStudentId = (studentName) => {
  // 直接返回学生名字作为ID
  return studentName;
};

// 保存学生答案和批改结果
const saveStudentAnswersWithGrades = async (
  examId,
  studentId,
  studentName,
  gradeResults
) => {
  // 计算总分
  const totalScore = gradeResults.reduce(
    (sum, result) => sum + result.score,
    0
  );

  // 准备保存的数据
  const saveData = {
    examId,
    studentId,
    studentName,
    totalScore,
    answers: gradeResults.map((result) => ({
      chineseNumber: result.chineseNumber,
      questionNumber: result.questionNumber,
      studentAnswer: result.studentAnswer,
      standardAnswer: result.standardAnswer,
      isCorrect: result.isCorrect,
      score: result.score,
      questionType: result.questionType,
    })),
  };

  // 调用API保存学生答案和批改结果
  const response = await studentApi.saveStudentAnswersWithGrades(saveData);

  if (response.success) {
    return {
      success: true,
      savedCount: response.data.savedCount,
      totalScore,
    };
  } else {
    throw new Error(response.message || "保存学生答案失败");
  }
};

// AI分析考试成绩
const analyzeExamStatistics = async () => {
  if (!latestExam.value || examStatistics.studentCount === 0) {
    ElMessage.warning("暂无学生成绩数据，无法进行分析");
    return;
  }

  // 设置按钮加载状态
  aiAnalysisLoading.value = true;

  try {
    // 准备发送给AI的数据
    const analysisData = {
      examTitle: latestExam.value.title || "未命名考试",
      totalScore: examStatistics.totalScore,
      studentCount: examStatistics.studentCount,
      highestScore: examStatistics.highestScore,
      highestScoreStudent: examStatistics.highestScoreStudent,
      lowestScore: examStatistics.lowestScore,
      averageScore: examStatistics.averageScore,
      studentScores: studentList.value.map((student) => ({
        name: student.student_name,
        score: student.score,
      })),
    };

    // 构建提示文本
    const promptText = `请对以下考试成绩数据进行分析：
考试名称：${analysisData.examTitle}
试卷总分：${analysisData.totalScore}分
参考学生数：${analysisData.studentCount}人
最高分：${analysisData.highestScore}分（${
      analysisData.highestScoreStudent || "无名"
    }）
最低分：${analysisData.lowestScore}分
平均分：${analysisData.averageScore}分

学生成绩列表：
${analysisData.studentScores.map((s) => `${s.name}: ${s.score}分`).join("\n")}

请提供以下分析：
1. 本次考试的整体情况评价
2. 成绩分布情况分析
3. 针对不同分数段学生的学习建议
4. 教师可以采取的改进措施`;

    // 构建消息
    const messages = [
      {
        role: "system",
        content:
          "你是一位专业的教育分析师，擅长分析考试成绩数据并提供有价值的教学建议。请根据提供的考试成绩数据，进行全面的分析，并给出针对性的建议。",
      },
      {
        role: "user",
        content: promptText,
      },
    ];

    // 调用deepseek-V3模型
    const response = await axios.post(
      "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      {
        model: "deepseek-v3-250324",
        stream: false,
        messages: messages,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ef368e0b-4512-41c2-a2c0-4efa63906f6d`,
        },
      }
    );

    // 获取AI分析结果
    aiAnalysisResult.value = response.data.choices[0].message.content;
    // 显示分析结果
    showAiAnalysis.value = true;
  } catch (error) {
    console.error("AI分析考试成绩失败:", error);
    ElMessage.error("AI分析考试成绩失败，请重试");
  } finally {
    // 关闭按钮加载状态
    aiAnalysisLoading.value = false;
  }
};

// 更新成绩统计信息
const updateExamStatistics = () => {
  if (!latestExam.value) {
    ElMessage.warning("请先创建考试");
    return;
  }

  // 显示加载中提示
  const loadingInstance = ElLoading.service({
    lock: true,
    text: "正在处理学生成绩数据...",
    spinner: "el-icon-loading",
    background: "rgba(0, 0, 0, 0.7)",
  });

  // 先保存学生成绩，然后获取统计信息
  studentApi
    .saveStudentGrades(latestExam.value.id)
    .then((response) => {
      console.log(response);
      if (response.success) {
        console.log("学生成绩保存成功:", response.message);
        // 保存成功后获取统计信息
        return studentApi.getExamStatistics(latestExam.value.id);
      } else {
        throw new Error(response.message || "保存学生成绩失败");
      }
    })
    .then((response) => {
      if (response.success) {
        Object.assign(examStatistics, response.data);
        // 如果没有学生记录，清空统计信息
        if (!studentList.value || studentList.value.length === 0) {
          examStatistics.studentCount = 0;
          examStatistics.averageScore = 0;
          examStatistics.highestScore = 0;
          examStatistics.highestScoreStudent = "";
          examStatistics.lowestScore = 0;
          examStatistics.totalScore = 0;

          // 隐藏AI分析结果
          showAiAnalysis.value = false;
          aiAnalysisResult.value = "";

          ElMessage.info("暂无学生成绩数据");
          return;
        }
        // 更新学生列表
        getStudentList();
        ElMessage.success("成绩统计更新完成");
      } else {
        throw new Error(response.message || "获取考试统计信息失败");
      }
    })
    .catch((error) => {
      console.error("处理学生成绩数据失败:", error);
      ElMessage.error(error.message || "处理学生成绩数据失败，请重试");
    })
    .finally(() => {
      loadingInstance.close();
    });
};

// 获取考试统计信息
const getExamStatistics = () => {
  if (!latestExam.value) {
    return;
  }

  // 获取统计信息
  studentApi
    .getExamStatistics(latestExam.value.id)
    .then((response) => {
      if (response.success) {
        Object.assign(examStatistics, response.data);
        console.log("成功获取考试统计信息");

        // 获取学生列表
        getStudentList();
      } else {
        console.warn("获取考试统计信息失败:", response.message);
      }
    })
    .catch((error) => {
      console.error("获取考试统计信息失败:", error);
    });
};

// 获取学生列表
const getStudentList = () => {
  if (!latestExam.value) {
    return;
  }

  studentListLoading.value = true;

  // 获取学生列表
  studentApi
    .getStudentList(latestExam.value.id)
    .then((response) => {
      if (response.success) {
        studentList.value = response.data;
        console.log("成功获取学生列表:", studentList.value);
      } else {
        console.warn("获取学生列表失败:", response.message);
      }
    })
    .catch((error) => {
      console.error("获取学生列表失败:", error);
    })
    .finally(() => {
      studentListLoading.value = false;
    });
};

// 查看学生错题
const viewStudentWrongAnswers = (student) => {
  if (!latestExam.value) {
    ElMessage.warning("请先创建考试");
    return;
  }

  // 跳转到学生错题详情页面
  router.push({
    name: "StudentWrongAnswers",
    params: {
      examId: latestExam.value.id,
      studentId: student.student_name,
      studentName: student.student_name,
    },
  });
};

// 获取最新考试
const fetchLatestExam = () => {
  loading.value = true;
  // 检查路由参数中是否有考试ID
  const examId = route.params.examId;

  if (examId) {
    // 如果路由中有考试ID，直接获取该考试
    examApi
      .getExamById(examId)
      .then((response) => {
        if (response.data.success) {
          latestExam.value = response.data.data;

          // 获取该考试的答案
          return examApi.getAnswers(latestExam.value.id);
        } else {
          throw new Error(response.data.message || "获取考试详情失败");
        }
      })
      .then((response) => {
        if (
          response &&
          response.data.success &&
          response.data.data &&
          response.data.data.length > 0
        ) {
          // 处理返回的答案数据，重建questionSections
          const answers = response.data.data;
          const sectionMap = new Map();
          answers.forEach((answer) => {
            const sectionIndex = answer.section_index - 1;
            const questionNumber = answer.question_number;

            if (!sectionMap.has(sectionIndex)) {
              sectionMap.set(sectionIndex, {
                type: answer.section_type,
                startNum: questionNumber, // 暂时设置，后面会更新
                score: answer.score,
                questions: [],
              });
            }

            const section = sectionMap.get(sectionIndex);
            // 更新起始题号（取最小值）
            section.startNum = Math.min(section.startNum, questionNumber);

            // 添加问题
            const questionIndex = questionNumber - section.startNum;
            while (section.questions.length <= questionIndex) {
              section.questions.push({ answer: "" });
            }
            section.questions[questionIndex].answer = answer.answer;
          });

          // 转换Map为数组
          questionSections.value = Array.from(sectionMap.values());

          // 从答案数据中提取中文题号
          answers.forEach((answer) => {
            if (answer.chinese_number) {
              const sectionIndex = answer.section_index - 1;
              if (
                sectionIndex >= 0 &&
                sectionIndex < questionSections.value.length
              ) {
                questionSections.value[sectionIndex].chineseNumber =
                  answer.chinese_number;
              }
            }
          });

          // 深拷贝保存原始数据
          originalSections.value = JSON.parse(
            JSON.stringify(questionSections.value)
          );
        }
      })
      .finally(() => {
        loading.value = false;

        // 如果已经加载了考试信息，则获取统计信息
        if (latestExam.value) {
          getExamStatistics();
        }
      });
  } else {
    // 从Pinia中获取当前登录的教师ID
    const teacherId = userStore.userInfo ? userStore.userInfo.id : 1;

    // 获取教师的所有考试
    examApi
      .getExamsByTeacherId(teacherId)
      .then((response) => {
        if (response.data.success) {
          const exams = response.data.data;
          if (exams && exams.length > 0) {
            // 按创建时间排序，获取最新的考试
            exams.sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
            latestExam.value = exams[0];

            // 获取该考试的答案
            return examApi.getAnswers(latestExam.value.id);
          } else {
            latestExam.value = null;
            loading.value = false;
          }
        } else {
          throw new Error(response.data.message || "获取考试列表失败");
        }
      })
      .then((response) => {
        if (
          response &&
          response.data.success &&
          response.data.data &&
          response.data.data.length > 0
        ) {
          // 处理返回的答案数据，重建questionSections
          const answers = response.data.data;
          const sectionMap = new Map();

          answers.forEach((answer) => {
            const sectionIndex = answer.section_index - 1;
            const questionNumber = answer.question_number;

            if (!sectionMap.has(sectionIndex)) {
              sectionMap.set(sectionIndex, {
                type: answer.section_type,
                startNum: questionNumber, // 暂时设置，后面会更新
                score: answer.score,
                questions: [],
              });
            }

            const section = sectionMap.get(sectionIndex);
            // 更新起始题号（取最小值）
            section.startNum = Math.min(section.startNum, questionNumber);

            // 添加问题
            const questionIndex = questionNumber - section.startNum;
            while (section.questions.length <= questionIndex) {
              section.questions.push({ answer: "" });
            }
            section.questions[questionIndex].answer = answer.answer;
          });

          // 转换Map为数组
          questionSections.value = Array.from(sectionMap.values());

          // 从答案数据中提取中文题号
          answers.forEach((answer) => {
            if (answer.chinese_number) {
              const sectionIndex = answer.section_index - 1;
              if (
                sectionIndex >= 0 &&
                sectionIndex < questionSections.value.length
              ) {
                questionSections.value[sectionIndex].chineseNumber =
                  answer.chinese_number;
              }
            }
          });

          // 深拷贝保存原始数据
          originalSections.value = JSON.parse(
            JSON.stringify(questionSections.value)
          );
        }
      })
      .finally(() => {
        loading.value = false;

        // 如果已经加载了考试信息，则获取统计信息
        if (latestExam.value) {
          getExamStatistics();
        }
      });
  }
};

// 在组件挂载前获取最新考试
onBeforeMount(() => {
  fetchLatestExam();
});

// 在组件挂载后获取统计信息
onMounted(() => {
  // 如果已经加载了考试信息，则获取统计信息
  if (latestExam.value) {
    getExamStatistics();
  }
});
</script>

<style scoped>
.exam-content-container {
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

.exam-info {
  margin-bottom: 20px;
}

.exam-date {
  color: #909399;
  font-size: 14px;
}

.edit-status-tip {
  margin-bottom: 20px;
}

.question-sections {
  margin-top: 20px;
}

.question-section-card {
  margin-bottom: 15px;
}

.section-header {
  display: flex;
  flex-direction: column;
}

.section-type-badge {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 15px;
  color: white;
  margin-bottom: 10px;
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

.section-score {
  margin-left: 5px;
}

.questions-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.question-item {
  display: flex;
  align-items: center;
  margin-right: 15px;
  margin-bottom: 10px;
  position: relative;
}

.answer-input {
  width: 80px;
  margin-left: 5px;
}

.judgment-input {
  display: none;
}

.judgment-select {
  width: 80px;
  margin-left: 5px;
}

.essay-question-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  margin-bottom: 20px;
}

/* AI分析对话框样式 */
.analysis-dialog {
  max-width: 800px;
  max-height: 80vh;
}

.analysis-dialog .el-message-box__content {
  max-height: 60vh;
  overflow-y: auto;
  white-space: pre-line;
  line-height: 1.6;
}

.essay-input {
  width: 100%;
  margin-top: 10px;
}

.action-buttons {
  margin-top: 30px;
  text-align: center;
}

.loading-state,
.error-state,
.empty-state {
  margin-top: 40px;
  text-align: center;
}

.create-exam-btn {
  margin-top: 20px;
}

.upload-tip {
  margin-top: 10px;
  text-align: left;
}

.upload-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.upload-area {
  width: 100%;
  margin-bottom: 20px;
}

.file-prefixes-container {
  margin-top: 15px;
  border-top: 1px solid #ebeef5;
  padding-top: 15px;
}

.file-prefix-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

.statistics-loading {
  padding: 20px;
}

.statistics-section {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.statistics-content {
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
}

.statistics-item {
  padding: 10px 20px;
  font-size: 16px;
  text-align: center;
  flex: 1;
  min-width: 200px;
}

.statistics-label {
  font-weight: bold;
  color: #606266;
  display: block;
  margin-bottom: 5px;
}

.statistics-value {
  color: #409eff;
  font-weight: bold;
  font-size: 24px;
}

.statistics-student {
  color: #67c23a;
  margin-left: 5px;
  font-size: 14px;
}

.student-list-section {
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
  padding-top: 15px;
}

.student-list-title {
  font-size: 18px;
  color: #606266;
  margin-bottom: 15px;
}

.student-list {
  margin-top: 15px;
}

/* AI分析结果区域样式 */
.ai-analysis-section {
  margin-top: 30px;
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
}

.ai-analysis-title {
  font-size: 18px;
  color: #606266;
  margin-bottom: 15px;
}

.ai-analysis-card {
  margin-bottom: 20px;
}

.ai-analysis-content {
  line-height: 1.8;
  white-space: pre-line;
  color: #303133;
  font-size: 14px;
}
</style>
