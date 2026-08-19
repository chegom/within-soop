# WITHIN SOOP

> 각자의 자리에서, 같은 숲 안에.

혼자 Codex나 Claude Code와 작업할 때도 다른 사람들과 조용히 같은 공간에 있는 감각을 주는 Mac·Windows 데스크톱 앱입니다. `WITHIN`은 `WITH · IN`—함께, SOOP 안에서—라는 제품의 방식을 담습니다.

[웹에서 설치하기](https://chegom.github.io/within-soop/) · [최신 릴리스](https://github.com/chegom/within-soop/releases/latest)

## 지금 할 수 있는 일

- Codex·Claude Code 프로세스를 로컬에서 4초마다 감지
- 실제 프로세스 시작 시간을 기준으로 현재 연속 세션 시간 표시
- 이메일·비밀번호 없이 익명으로 비공개 작업실 생성·참여
- 최대 10명의 실제 구성원, 소개글·동물 캐릭터·작업/자리 비움/연결 끊김 상태 동기화
- 설치 안내로 이어지는 HTTPS 초대 링크와 7일짜리 초대 코드
- `withinsoop://join/<초대 코드>` 앱 딥링크 및 기존 `gyeot://` 링크 호환
- 비공개 Realtime 이모티콘(4초 표시)과 끊긴 연결의 15초 유예 판정
- Realtime 재연결 backoff, 접근할 수 없는 저장 방 자동 복구, 로컬 작업실 나가기
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

## 구조

- `src/App.tsx`: 프로필·로컬 세션·활성 방을 연결하는 화면 컨트롤러
- `src/components`: 전체 화면, 축소 위젯, 설정과 캐릭터 표현
- `src/room`: 방 도메인 제약, Supabase 전송 계층, 생명주기·재연결 상태
- `src/native`: React에서 사용하는 Tauri 세션 감지·창 상태 훅
- `src-tauri`: 로컬 프로세스 감지와 데스크톱 창 제어
- `supabase`: 방 스키마, 원자적 RPC, RLS와 pgTAP 검증

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

## 서로 다른 장소에서 함께 쓰기

WITHIN SOOP은 웹사이트가 아니라 Tauri 데스크톱 앱입니다. 두 사람 모두 같은 버전의 설치본을
실행하고, 이미 호스팅된 Supabase 프로젝트를 통해 실시간 상태를 동기화합니다.

1. A가 방을 만들고 `초대 링크 복사`를 누릅니다.
2. B가 `https://chegom.github.io/within-soop/?join=...` 링크를 엽니다.
3. 설치되어 있으면 `WITHIN SOOP에서 초대 열기`를 누르고, 없다면 같은 페이지에서
   운영체제에 맞는 설치본을 받습니다.
4. 앱이 링크를 열지 못하면 48자리 코드를 복사해 WITHIN SOOP의 `초대 코드`
   입력란에 붙여 넣습니다.

0.1.0 설치본에서 만든 `gyeot://join/...` 링크도 계속 열 수 있습니다.

참여자에게 Supabase 계정이나 이 저장소 접근 권한은 필요하지 않습니다. 초대 코드는
7일 동안 유효합니다.

## 데스크톱 설치본 배포

`.github/workflows/release.yml`은 GitHub Actions에서 macOS Apple Silicon, macOS Intel,
Windows x64 NSIS 설치본을 만들고 초안 GitHub Release에 첨부합니다. 저장소 Actions
secret에 다음 공개 클라이언트 환경 변수가 있어야 합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

`Desktop Release` 워크플로를 수동 실행하거나 `v0.1.0` 같은 버전 태그를 푸시하면
설치본 빌드가 시작됩니다. 현재 워크플로는 테스트 배포를 위한 ad-hoc macOS 서명을
사용합니다. 외부 공개 배포 전에는 macOS 공증과 Windows 코드 서명을 추가해야 합니다.

## 설치·초대 웹페이지

`site`는 GitHub Pages에 배포되는 정적 랜딩 페이지입니다. 최신 공개 릴리스의 자산을
GitHub API에서 읽어 Apple Silicon·Intel Mac과 Windows 설치 버튼을 연결합니다.
`?join=<48자리 코드>`가 있으면 설치된 앱의 `withinsoop://` 딥링크를 여는 초대 화면을
먼저 보여줍니다. `.github/workflows/pages.yml`이 `main`의 `site/**` 변경을 자동 배포합니다.

## 호스팅 백엔드 출시 체크리스트

1. Supabase 프로젝트에서 Anonymous Sign-Ins, Realtime, private-only channels를 켭니다. 이 저장소의 RLS 정책은 방 구성원만 `room:<UUID>` 채널을 읽고 쓸 수 있게 합니다.
2. `.env`에 공개 가능한 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`만 넣습니다. secret key, service-role key, JWT secret은 앱·Git·CI 로그에 넣지 않습니다.
3. 프로젝트를 연결한 뒤, 먼저 마이그레이션 범위를 확인합니다.

   ```bash
   supabase link
   supabase db push --dry-run
   ```

   로컬과 원격에 `20260807000000_private_realtime_rooms.sql`과
   `20260812000000_global_online_count.sql`이 모두 표시되고, dry-run 결과가
   `Remote database is up to date.`인지 확인합니다. 새 마이그레이션이 보이면 프로젝트
   소유자의 명시적 승인 뒤에만 실제 `supabase db push`를 실행합니다.
4. Supabase Dashboard의 서버 측 스케줄 작업으로 매일 오래된 익명 Auth 사용자를 삭제합니다. 조건은 `is_anonymous is true` 이면서 `created_at < now() - interval '30 days'`입니다. 이 작업만 서버 전용 Auth 권한을 사용합니다.
5. 서로 다른 설치본 또는 WebView 프로필 두 개로 다음을 확인합니다.

   - A가 방을 만들고 B가 코드 또는 딥링크로 참여한다.
   - 양쪽 모두 이름·소개·동물 캐릭터가 새로고침 없이 보인다.
   - 상대는 `함께 작업 중`, `자리 비움`, `연결 끊김`만 보며 도구 이름은 보지 못한다.
   - 네 가지 이모티콘이 상대 화면에 나타난 뒤 약 4초 후 사라진다.
   - B를 끊으면 15초 뒤 연결 끊김으로 바뀌고, 다시 연결하면 복구된다.
   - 11번째 참여와 비참여자의 다른 방 채널 접근이 거부된다.
