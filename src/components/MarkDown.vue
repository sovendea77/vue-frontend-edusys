<template>
  <div v-html="htmlContent" class="markdown-body"></div>
</template>

<script>
import { defineComponent, nextTick, onMounted, ref, watch } from "vue";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import "github-markdown-css/github-markdown-light.css";
import mathJax from "@/utils/MathJax";

let doCopy = function (e) {
  const code = this.parentNode.parentNode.querySelector("code");
  navigator.clipboard
    .writeText(code.innerText)
    .then(() => {
      // 用Ant Design Vue 进行提示，不喜欢可以换掉
      message.success("复制成功");
    })
    .catch((error) => {
      // 用Ant Design Vue 进行提示，不喜欢可以换掉
      message.error("复制失败");
    });
};

export default defineComponent({
  name: "DynamicMarkdown",
  props: {
    value: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const htmlContent = ref("");

    // 初始化 marked 实例
    const marked = new Marked(
      markedHighlight({
        async: false,
        langPrefix: "language-",
        emptyLangClass: "no-lang",
        highlight: (code, language) => {
          // 代码高亮自动识别语言的关键就在这里
          return hljs.highlightAuto(code, [language]).value;
        },
      })
    );

    // 增强代码块功能
    const enhanceCodeBlock = (content) => {
      return content.replace(
        /<pre><code/g,
        '<pre><div class="enhance"><div class="copyCode">复制</div></div><code'
      );
    };

    // 复制功能绑定
    const bindCopyFunction = (el) => {
      const codeBlocks = el.querySelectorAll("pre");
      codeBlocks.forEach((codeBlock) => {
        const enhance = codeBlock.querySelector(".enhance");
        if (enhance) {
          const copyCode = enhance.querySelector(".copyCode");
          if (copyCode) {
            copyCode.removeEventListener("click", doCopy);
            copyCode.addEventListener("click", doCopy);
          }
        }
      });
    };

    // 解析 Markdown 内容
    const parseMarkdown = () => {
      htmlContent.value = props.value;
      // 这里是关键，很多人就折在这了，时序上一定是先转公式，再取出来转Markdown，最后转代码
      nextTick(() => {
        // 先转公式
        if (mathJax) {
          if (mathJax.isMathjaxConfig) {
            mathJax.initMathjaxConfig();
          }
          mathJax.TypeSet();
        }
        nextTick(() => {
          htmlContent.value =
            document.querySelector(".markdown-body").innerHTML;
          htmlContent.value = enhanceCodeBlock(marked.parse(htmlContent.value));
          nextTick(() => {
            const el = document.querySelector(".markdown-body");
            if (el) {
              bindCopyFunction(el);
            }
          });
        });
      });
    };

    // 监听 value 变化
    watch(
      () => props.value,
      (newValue, oldValue) => {
        if (newValue) {
          parseMarkdown();
        }
      },
      { immediate: true }
    );

    onMounted(() => {
      if (props.value) {
        parseMarkdown();
      }
    });

    return {
      htmlContent,
    };
  },
});
</script>
<style lang="less">
.markdown-body {
  padding: 20px;
  box-sizing: border-box;
  background-color: transparent;
}

pre {
  position: relative;
}

pre .enhance {
  display: flex;
  color: #247aaa;
  padding: 10px;
  box-sizing: border-box;
  font-size: 12px;
  border-radius: 9px;
  justify-content: flex-end;
  //background-color: #202020;
  position: absolute;
  top: 0;
  right: 0;

  .copyCode {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover {
      color: rgba(2, 120, 255, 0.84);
    }

    i {
      font-size: 16px;
      margin-left: 5px;
    }
  }
}
.markdown-body code,
.markdown-body tt {
  background-color: #ffe6e6;
  color: #df3b3b;
}
</style>
