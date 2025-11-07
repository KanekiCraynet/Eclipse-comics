import { useState } from 'react';
import { READING_MODES } from '@/hooks/useReadingPreferences';
import { FaBook, FaImage, FaBars } from 'react-icons/fa6';

const ReadingModeSelector = ({ currentMode, onModeChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const modes = [
    { value: READING_MODES.WEBTOON, label: 'Webtoon', icon: FaBars },
    { value: READING_MODES.MANGA, label: 'Manga', icon: FaBook },
    { value: READING_MODES.LONG_STRIP, label: 'Long Strip', icon: FaImage },
  ];

  const currentModeData = modes.find(m => m.value === currentMode) || modes[0];
  const CurrentIcon = currentModeData.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#212121] hover:bg-[#171717] px-3 py-2 rounded-lg transition-colors"
        aria-label="Reading mode selector"
      >
        <CurrentIcon className="text-sm" />
        <span className="text-sm font-medium">{currentModeData.label}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 right-0 bg-[#212121] rounded-lg shadow-lg z-50 min-w-[150px]">
            {modes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.value}
                  onClick={() => {
                    onModeChange(mode.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-[#171717] transition-colors ${
                    currentMode === mode.value ? 'bg-[#171717]' : ''
                  }`}
                >
                  <Icon className="text-sm" />
                  <span className="text-sm">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ReadingModeSelector;

