# 곁 (Gyeot)

혼자 Codex나 Claude Code와 작업할 때, 다른 사람들과 조용히 같은 방에 있는 감각을 주는 Mac·Windows 데스크톱 앱입니다.

## 지금 할 수 있는 일

- Codex·Claude Code 프로세스를 로컬에서 4초마다 감지
- 실제 프로세스 시작 시간을 기준으로 현재 연속 세션 시간 표시
- 이메일·비밀번호 없이 익명으로 비공개 작업실 생성·참여
- 최대 10명의 실제 구성원, 소개글·동물 캐릭터·작업/자리 비움/연결 끊김 상태 동기화
- `gyeot://join/<초대 코드>` 딥링크와 7일짜리 초대 코드
- 비공개 Realtime 이모티콘(4초 표시)과 끊긴 연결의 15초 유예 판정
- 첫 실행 때 동물과 어울리는 추천 이름(예: `다정한 곰`, `느긋한 여우`) 저장
- 축소 위젯과 `920×700` 관리 화면 전환
- 축소 시 현재 모니터 오른쪽 아래 배치, 항상 위 표시, 드래그 이동
- macOS 전체 화면 앱과 다른 Space에서도 축소 위젯 표시
- 마지막으로 선택한 창 모드·소개·캐릭터를 다음 실행에도 유지

프로세스 이름과 실행 경로는 이 기기에서의 상태 판별에만 사용합니다. 서버에는 표시 이름, 동물 캐릭터, 한 줄 소개, 작업 여부, 시작 시각, 마지막 연결 시각만 전송합니다. 프롬프트, 터미널 내용, 파일 경로, 감지한 도구 이름은 전송하거나 다른 구성원에게 표시하지 않습니다.

Supabase Anonymous Auth는 내부 식별자를 만들지만, 이메일·비밀번호·프로필 같은 회원 정보는 수집하지 않습니다.

## 실행

```bash
npm install
npm run tauri dev
```

프런트엔드 화면만 확인하려면:

```bash
npm run dev
```

## 확인 명령

```bash
npm run build
npm run test:run
npm run supabase:reset
npm run supabase:test
cargo test --manifest-path src-tauri/Cargo.toml
```

## 실시간 방 개발

개인 정보 없는 익명 사용자가 비공개 방에 참여하도록 Supabase를 사용합니다. URL과
publishable key만 클라이언트 환경 변수에 넣고, secret/service key는 절대 앱이나
Git에 넣지 않습니다.

```bash
cp .env.example .env
npm run supabase:start
npm run supabase:reset
npm run supabase:test
```

로컬 Supabase는 이 프로젝트의 전용 `55321–55329` 포트를 사용합니다. 시작 결과에
표시된 Project URL과 Publishable key를 `.env`에 채운 뒤 `npm run tauri dev`로
동작을 확인합니다.

## 호스팅 출시 체크리스트

1. Supabase 프로젝트에서 Anonymous Sign-Ins, Realtime, private-only channels를 켭니다. 이 저장소의 RLS 정책은 방 구성원만 `room:<UUID>` 채널을 읽고 쓸 수 있게 합니다.
2. `.env`에 공개 가능한 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`만 넣습니다. secret key, service-role key, JWT secret은 앱·Git·CI 로그에 넣지 않습니다.
3. 프로젝트를 연결한 뒤, 먼저 마이그레이션 범위를 확인합니다.

   ```bash
   supabase link
   supabase db push --dry-run
   ```

   `20260807000000_private_realtime_rooms.sql`만 보이는 것을 확인하고, 프로젝트 소유자의 명시적 승인 뒤에만 `supabase db push`를 실행합니다.
4. Supabase Dashboard의 서버 측 스케줄 작업으로 매일 오래된 익명 Auth 사용자를 삭제합니다. 조건은 `is_anonymous is true` 이면서 `created_at < now() - interval '30 days'`입니다. 이 작업만 서버 전용 Auth 권한을 사용합니다.
5. 서로 다른 설치본 또는 WebView 프로필 두 개로 다음을 확인합니다.

   - A가 방을 만들고 B가 코드 또는 딥링크로 참여한다.
   - 양쪽 모두 이름·소개·동물 캐릭터가 새로고침 없이 보인다.
   - 상대는 `함께 작업 중`, `자리 비움`, `연결 끊김`만 보며 도구 이름은 보지 못한다.
   - 네 가지 이모티콘이 상대 화면에 나타난 뒤 약 4초 후 사라진다.
   - B를 끊으면 15초 뒤 연결 끊김으로 바뀌고, 다시 연결하면 복구된다.
   - 11번째 참여와 비참여자의 다른 방 채널 접근이 거부된다.
