import React, { useState, useEffect } from 'react';
import { processVoiceTranscription } from '../services/openaiService';

interface VoiceInterfaceProps {
  onClose: () => void;
  onProcess: (data: any) => void;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onClose, onProcess }) => {
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  useEffect(() => {
    // Initialize SpeechRecognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Show interim results or finalize
        if (finalTranscript || interimTranscript) {
          setTranscription(prev => finalTranscript ? prev + ' ' + finalTranscript : interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        // Ignore "aborted" error as it often happens when stopping manually or unmounting
        if (event.error === 'aborted' || event.error === 'no-speech') {
          return;
        }
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;

      // Auto-start
      recognition.start();
      setIsListening(true);
    } else {
      alert('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Safari.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleStop = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (!transcription) {
      alert("No escuché nada. Intenta de nuevo.");
      onClose();
      return;
    }

    setIsProcessing(true);
    const result = await processVoiceTranscription(transcription);
    if (result) {
      onProcess(result);
    } else {
      setIsProcessing(false);
      alert("Error analizando la información con IA. Intenta de nuevo.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-background-dark flex flex-col items-center justify-between py-16 px-8 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="text-center space-y-4 mt-8">
        <h2 className="text-primary text-2xl font-bold tracking-tight">
          {isProcessing ? 'Procesando con IA...' : 'Escuchando y procesando...'}
        </h2>
        <div className="flex gap-1.5 justify-center items-center h-12">
          {!isProcessing ? (
            <>
              <div className="waveform-bar" style={{ animationDelay: '0s' }}></div>
              <div className="waveform-bar" style={{ animationDelay: '0.2s' }}></div>
              <div className="waveform-bar" style={{ animationDelay: '0.4s' }}></div>
              <div className="waveform-bar" style={{ animationDelay: '0.1s' }}></div>
              <div className="waveform-bar" style={{ animationDelay: '0.3s' }}></div>
            </>
          ) : (
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
      </div>

      <div className="relative flex items-center justify-center w-64 h-64">
        <div className="absolute w-24 h-24 bg-primary/20 rounded-full animate-ripple-1"></div>
        <div className="relative z-10 size-28 bg-primary rounded-full flex items-center justify-center shadow-2xl shadow-primary/40">
          <span className="material-symbols-outlined !text-5xl text-white">
            {isProcessing ? 'auto_awesome' : 'mic'}
          </span>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-12 flex flex-col items-center">
        <div className="text-center px-4 min-h-[80px]">
          <p className="text-slate-500 dark:text-slate-400 text-xl leading-relaxed italic">
            "{transcription || 'Hable ahora...'}"
          </p>
        </div>

        <div className="w-full space-y-4">
          <button
            onClick={handleStop}
            disabled={isProcessing}
            className="w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-primary/25 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">stop_circle</span>
            <span>{isProcessing ? 'Analizando...' : 'Detener y procesar'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full text-slate-500 font-bold py-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceInterface;
