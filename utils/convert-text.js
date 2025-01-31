import * as OpenCC from 'opencc-js';
import config from '../config/index.js';
import {removeMarkdown} from "./index.js";

const convertText = (text) => {
  text = removeMarkdown(text);
  // A good system prompt should be enough to persuade llm to output desired wording and characters (simplified/traditional)
  if (!config.ENABLE_ZH_CN_CONVERTER) return text;
  if (config.APP_LANG === 'zh_TW') {
    const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
    return converter(text);
  }
  if (config.APP_LANG === 'zh_CN') {
    const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });
    return converter(text);
  }
  return text;
};

export default convertText;
