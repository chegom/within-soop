import {
  DISPLAY_NAME_MAX_LENGTH,
  FOREST_SPECIES,
  INTRO_MAX_LENGTH,
  speciesLabel,
  type ForestSpecies,
} from "../room/constants";
import { pickRecommendedSpecies } from "../room/profile";
import { ForestCharacter } from "./ForestCharacter";

type ProfileDialogProps = {
  draftName: string;
  draftIntro: string;
  draftSpecies: ForestSpecies;
  onNameChange: (value: string) => void;
  onIntroChange: (value: string) => void;
  onSpeciesChange: (value: ForestSpecies) => void;
  onSave: () => void;
  onClose: () => void;
};

export function ProfileDialog({
  draftName,
  draftIntro,
  draftSpecies,
  onNameChange,
  onIntroChange,
  onSpeciesChange,
  onSave,
  onClose,
}: ProfileDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="intro-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="eyebrow">내 자리</span>
        <h2 id="intro-dialog-title">짧게 나를 소개해요</h2>
        <p>표시 이름, 동물 캐릭터, 이 한 줄만 함께 있는 사람에게 보여요.</p>
        <label className="dialog-field">
          <span>표시 이름</span>
          <input
            value={draftName}
            onChange={(event) =>
              onNameChange(event.target.value.slice(0, DISPLAY_NAME_MAX_LENGTH))
            }
            aria-label="표시 이름"
          />
        </label>
        <div className="species-picker" role="radiogroup" aria-label="내 동물 고르기">
          {FOREST_SPECIES.map((item) => (
            <button
              type="button"
              key={item}
              role="radio"
              aria-checked={draftSpecies === item}
              className={`species-option ${draftSpecies === item ? "is-selected" : ""}`}
              onClick={() => onSpeciesChange(item)}
              title={speciesLabel[item]}
            >
              <ForestCharacter species={item} active />
              <span>{speciesLabel[item]}</span>
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={false}
            className="species-option"
            onClick={() => onSpeciesChange(pickRecommendedSpecies(Math.random))}
          >
            <span className="species-random">🎲</span>
            <span>랜덤 추천</span>
          </button>
        </div>
        <label className="dialog-field">
          <span>한 줄 소개</span>
          <input
            value={draftIntro}
            onChange={(event) =>
              onIntroChange(event.target.value.slice(0, INTRO_MAX_LENGTH))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") onSave();
              if (event.key === "Escape") onClose();
            }}
            autoFocus
            aria-label="한 줄 소개"
          />
        </label>
        <div className="character-count">
          {draftIntro.length} / {INTRO_MAX_LENGTH}
        </div>
        <div className="dialog-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary-button" onClick={onSave}>
            소개 바꾸기
          </button>
        </div>
      </section>
    </div>
  );
}
