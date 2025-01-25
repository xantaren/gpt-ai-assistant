import { createAudioTranscriptions } from '../services/openai.js';

class Transcription {
  text;

  constructor({
    text,
  }) {
    this.text = text;
  }
}

/**
 * @param {Object} param
 * @param {Buffer} param.buffer
 * @param {string} param.file
 * @returns {Promise<Transcription>}
 */
const generateTranscription = async ({
  file,
  buffer,
}) => {
  try {
    const result = await createAudioTranscriptions({ file, buffer });

    // Check if `data` exists in the result
    if (result && result.data) {
      const transcription = new Transcription(result.data);
      console.log('Transcription created:', transcription);
      return transcription;
    } else {
      // If `data` doesn't exist, use the raw result (Usually Gemini Case)
      const rawTranscription = new Transcription(result);
      console.log('Raw transcription created:', rawTranscription);
      return rawTranscription;
    }
  } catch (error) {
    // Handle any errors from createAudioTranscriptions
    console.error('Error generating transcription:', error);
    throw error; // Re-throw the error if needed
  }
};

export default generateTranscription;
