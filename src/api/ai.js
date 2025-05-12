/**
 * AI模型API调用
 */

import axios from "axios";

// 创建axios实例
const request = axios.create({
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ef368e0b-4512-41c2-a2c0-4efa63906f6d`,
  },
});

// 响应拦截器
request.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

// 模型ID常量
const MODELS = {
  DOUBAO: "doubao-1.5-vision-pro-250328",
  DEEPSEEK: "deepseek-v3-250324",
  DEEPSEEK_R1: "deepseek-r1-250120",
};

export const aiApi = {
  /**
   * 将图片转换为Base64格式
   */
  convertImageToBase64: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  },

  /**
   * 调用doubao-1.5-vision-pro模型处理图片
   */
  processImagesWithDoubao: async (base64Images) => {
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `对于该图片内的所有题目，若没有附图，则完整给出题干以及相关选项（若有的话）；若带有附图则需要你给出题干的同时对附图做尽可能详细的，对解题有帮助的描述（我需要单看描述和题干就能解出题目）。描述应该标注在题干后面。不需要给出任何题包括选择填空判断解答题的答案（包括√和×）。按根据试卷的题目排版顺序给出。如
                  一、选择题（每小题分数）：
                  1.(题目...);2.(题目...); ...  // 1和2是每小题的数字题号, 不一定从1开始,需要你自己识别具体数字
                  二、填空题（每小题分数）：...
                  三、判断题（每小题分数）：...
                  四、解答题（每小题分数）：...    //证明题的话要给出证明过程
                  注意，纯文本返回，不准使用latex格式返回！`,
          },
          ...base64Images.map((base64) => ({
            type: "image_url",
            image_url: { url: base64 },
          })),
        ],
      },
    ];

    try {
      const response = await request.post("/chat/completions", {
        model: MODELS.DOUBAO,
        stream: false,
        messages,
      });
      return response;
    } catch (error) {
      console.error("调用doubao模型失败:", error);
      throw error;
    }
  },

  /**
   * 调用deepseek-V3模型处理文本
   */
  processTextWithDeepseek: async (content) => {
    const messages = [
      {
        role: "system",
        content: `这是一篇试卷的题目，请你联网查询题目答案，若无相关结果则请你理解每道题讲的是什么，然后分析给出每道题的正确答案（只需要答案），需要严格按格式打印出来，不需要分析过程，重点：生成的格式填写的必须只能是"选择题"，"填空题"，"判断题"，"解答题"，试卷的题型如果不属于这四种，需要你强行归类进这四种题目，判断不出就统一作为解答题生成。格式如下：
                  (中文题号)、选择题（每小题分数）
                  1.A
                  2.B...（每小题要换行，答案必须是选项）
                  (中文题号)、填空题（每小题分数）
                  ...
                  (中文题号)、判断题（每小题分数）
                  ...（判断题的答案只有"对"和"错"）
                  (中文题号)、解答题（每小题分数）
                  ...（解答题每小题不需要换行，只有解答题需要答题过程）`,
      },
      {
        role: "user",
        content,
      },
    ];

    try {
      const response = await request.post("/chat/completions", {
        model: MODELS.DEEPSEEK,
        stream: false,
        messages,
      });
      return response;
    } catch (error) {
      console.error("调用deepseek模型失败:", error);
      throw error;
    }
  },

  /**
   * 完整的图片处理流程：图片识别后再进行文本优化
   */
  processImagesWithAI: async (imageFiles) => {
    try {
      const base64Images = await Promise.all(
        imageFiles.map((file) => aiApi.convertImageToBase64(file))
      );

      const doubaoResult = await aiApi.processImagesWithDoubao(base64Images);
      const recognizedContent = doubaoResult.choices[0].message.content;

      const deepseekResult = await aiApi.processTextWithDeepseek(
        recognizedContent
      );

      return {
        originalRecognition: recognizedContent,
        optimizedResult: deepseekResult.choices[0].message.content,
      };
    } catch (error) {
      console.error("AI处理图片失败:", error);
      throw error;
    }
  },

  /**
   * 专门用于处理学生试卷的图片识别
   */
  processStudentPaperWithDoubao: async (imageFiles) => {
    try {
      const base64Images = await Promise.all(
        imageFiles.map((file) => aiApi.convertImageToBase64(file))
      );

      const messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `这是学生试卷我要提取他的填写答案来批改作业，请严格按照中文题号、数字题号.答案的格式输出学生填写的内容，注意每小题前面一定要附上中文题号！严格按照学生填什么你输出什么，若没有填写，就默认填了null，不需要解析。如
              一、1.A
              一、2.B
              一、3.null   //若没有填写默认为null`,
            },
            ...base64Images.map((base64) => ({
              type: "image_url",
              image_url: { url: base64 },
            })),
          ],
        },
      ];

      const response = await request.post("/chat/completions", {
        model: MODELS.DOUBAO,
        stream: false,
        messages,
      });

      const recognizedContent = response.choices[0].message.content;

      return {
        originalRecognition: recognizedContent,
        optimizedResult: recognizedContent,
      };
    } catch (error) {
      console.error("AI处理学生试卷失败:", error);
      throw error;
    }
  },

  /**
   * 使用deepseek-R1模型分析错题数据
   */
  analyzeWrongAnswersWithDeepseekR1: async (wrongAnswersData) => {
    try {
      const promptText = `根据该次考试的错题以及错误次数，分析该班学生的短板弱项并给出教学调整建议并且随机推送几道相关习题用作练习。\n\n错题数据：${JSON.stringify(
        wrongAnswersData,
        null,
        2
      )}`;

      const messages = [
        {
          role: "system",
          content:
            "你是一位专业的教育分析师，擅长分析学生的错题数据，找出学习短板并提供针对性的教学建议。",
        },
        {
          role: "user",
          content: promptText,
        },
      ];

      const response = await request.post("/chat/completions", {
        model: MODELS.DEEPSEEK_R1,
        stream: false,
        messages,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error("AI分析错题失败:", error);
      throw error;
    }
  },

  /**
   * 分析单个错题
   */
  analyzeWrongAnswerWithDeepseekR1: async (analysisData) => {
    try {
      const prompt = `请分析以下学生的错题并给出详细的解释：
                    题目类型：${analysisData.questionType}
                    题目内容：${analysisData.questionContent || "无题目内容"}
                    正确答案：${analysisData.correctAnswer}
                    学生答案：${analysisData.studentAnswer}
                    请从以下几个方面进行分析：
                    1. 错误原因分析
                    2. 知识点提示,回答格式为： 
                    1. 题目解析
                    2. 错误原因分析
                    3. 知识点提示，字数在400字左右`;

      const messages = [
        {
          role: "system",
          content:
            "你是一位专业的教育分析师，擅长分析学生的错题数据，找出学习短板并提供针对性的教学建议。",
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      const response = await request.post("/chat/completions", {
        model: MODELS.DEEPSEEK,
        stream: false,
        messages,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error("AI分析API调用失败:", error);
      throw error;
    }
  },

  /**
   * AI批改解答题
   */
  gradeEssayQuestionWithDeepseek: async (gradeData) => {
    try {
      const { studentAnswer, standardAnswer, totalScore } = gradeData;

      const promptText = `
请根据标准答案对学生的解答题答案进行评分。
标准答案：${standardAnswer}
学生答案：${studentAnswer}
总分：${totalScore}分

请仅返回一个数字，表示学生获得的分数（0-${totalScore}之间的数字，不可以有小数）。不要包含任何其他文字或解释。`;

      const messages = [
        {
          role: "system",
          content:
            "你是一位专业的教育评分者，根据标准答案对学生的解答题答案进行客观评分。请只返回分数，不要有任何其他文字。",
        },
        {
          role: "user",
          content: promptText,
        },
      ];

      const response = await request.post("/chat/completions", {
        model: MODELS.DEEPSEEK,
        stream: false,
        messages,
      });

      let scoreText = response.choices[0].message.content.trim();
      const scoreMatch = scoreText.match(/(\d+(\.\d+)?)/);
      if (scoreMatch) {
        scoreText = scoreMatch[0];
      }

      const score = parseFloat(scoreText);
      return Math.min(Math.max(0, score), totalScore);
    } catch (error) {
      console.error("AI批改失败:", error);
      throw error;
    }
  },

  /**
   * AI批改填空题
   */
  gradeFillQuestionWithDeepseek: async (gradeData) => {
    try {
      const { studentAnswer, standardAnswer, questionContent } = gradeData;

      const promptText = `
请根据标准答案对学生的填空题答案进行评判。
题目内容：${questionContent || "无题目内容"}
标准答案：${standardAnswer}
学生答案：${studentAnswer || "未作答"}

请仅返回"正确"或"错误"，不要包含任何其他文字或解释。`;

      const messages = [
        {
          role: "system",
          content:
            "你是一位专业的教育评分者，根据标准答案对学生的填空题答案进行客观评判。请只返回'正确'或'错误'，不要有任何其他文字。",
        },
        {
          role: "user",
          content: promptText,
        },
      ];

      const response = await request.post("/chat/completions", {
        model: MODELS.DEEPSEEK,
        stream: false,
        messages,
      });

      const resultText = response.choices[0].message.content
        .trim()
        .toLowerCase();
      return (
        resultText.includes("正确") ||
        resultText.includes("correct") ||
        resultText.includes("right")
      );
    } catch (error) {
      console.error("AI批改填空题失败:", error);
      throw error;
    }
  },

  /**
   * 批量批改学生试卷
   */
  batchGradeStudentPaper: async (batchGradeData) => {
    try {
      const { standardAnswers, studentAnswers } = batchGradeData;
      const results = [];

      for (let i = 0; i < studentAnswers.length; i++) {
        const studentAnswer = studentAnswers[i];
        const standardAnswer = standardAnswers.find(
          (sa) =>
            sa.chineseNumber === studentAnswer.chineseNumber &&
            sa.questionNumber === studentAnswer.questionNumber
        );

        if (!standardAnswer) {
          console.warn(
            `未找到对应的标准答案: ${studentAnswer.chineseNumber}、${studentAnswer.questionNumber}`
          );
          continue;
        }

        let isCorrect = false;
        let score = 0;
        const questionType = standardAnswer.type || "unknown";

        switch (questionType) {
          case "choice":
          case "judgment":
            isCorrect = studentAnswer.studentAnswer === standardAnswer.answer;
            score = isCorrect ? standardAnswer.score || 0 : 0;
            break;

          case "fill":
            if (studentAnswer.studentAnswer && standardAnswer.answer) {
              isCorrect = await aiApi.gradeFillQuestionWithDeepseek({
                studentAnswer: studentAnswer.studentAnswer,
                standardAnswer: standardAnswer.answer,
                questionContent: standardAnswer.content || "",
              });
              score = isCorrect ? standardAnswer.score || 0 : 0;
            }
            break;

          case "essay":
            if (studentAnswer.studentAnswer && standardAnswer.answer) {
              score = await aiApi.gradeEssayQuestionWithDeepseek({
                studentAnswer: studentAnswer.studentAnswer,
                standardAnswer: standardAnswer.answer,
                totalScore: standardAnswer.score || 0,
              });
              isCorrect = score >= (standardAnswer.score || 0);
            }
            break;
        }

        results.push({
          chineseNumber: studentAnswer.chineseNumber,
          questionNumber: studentAnswer.questionNumber,
          studentAnswer: studentAnswer.studentAnswer,
          standardAnswer: standardAnswer.answer,
          isCorrect,
          score,
          questionType,
        });
      }

      return results;
    } catch (error) {
      console.error("批量批改学生试卷失败:", error);
      throw error;
    }
  },
};
