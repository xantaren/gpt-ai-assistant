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

    // Check if `data` exists in the result (OpenAI case)
    if (result && result.data) {
      const transcription = new Transcription(result.data);
      console.log('Transcription created:', transcription);
      return transcription;

    } else if (typeof result === 'string') {
      // Handle raw string result (Gemini case)
      const rawTranscription = new Transcription({ text: result });
      console.log('Raw transcription created:', rawTranscription);
      return rawTranscription;

    } else {
      console.error('Invalid transcription result:', result);
    }
  } catch (error) {
    console.error('Error generating transcription:', error);
  }
};

export default generateTranscription;
