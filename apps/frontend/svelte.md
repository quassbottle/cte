# Правила идеальной поддерживаемой архитектуры SvelteKit-приложения

## 1. Главный принцип

Пиши код так, чтобы через 6 месяцев другой разработчик мог понять фичу без археологии.

Архитектура должна быть:

- простой;
- предсказуемой;
- типизированной;
- разделённой по ответственности;
- без магии, скрытых сайд-эффектов и «универсальных» абстракций;
- достаточно гибкой, но не переусложнённой заранее.

Если задачу можно решить простым `load`, action, компонентом и функцией из `$lib/server`, не создавай фреймворк внутри проекта.

---

## 2. Структура проекта

Используй SvelteKit-структуру, а не самодельную архитектуру поверх неё.

```txt
src/
  routes/
    +layout.svelte
    +layout.server.ts
    dashboard/
      +page.svelte
      +page.server.ts
      components/
        DashboardCard.svelte
  lib/
    components/
      ui/
      shared/
    server/
      db/
      repositories/
      services/
      auth/
    utils/
    schemas/
    types/
```

Правила:

- `src/routes` отвечает за маршруты, загрузку данных и page-specific UI.
- `$lib/components` — переиспользуемые компоненты.
- `$lib/server` — только серверный код: БД, внешние API, секреты, бизнес-логика.
- `$lib/schemas` — Zod-схемы, shared validation.
- `$lib/types` — общие типы, если они реально используются в нескольких местах.
- Не складывай всё в `utils`.
- Не создавай `core`, `common`, `helpers`, `shared` без ясной причины.
- Фича может иметь локальные `components/`, если эти компоненты не нужны вне маршрута.

---

## 3. Серверная логика

Вся работа с БД, секретами, токенами и внешними приватными API должна быть только в `$lib/server`.

Нельзя:

```ts
// плохо
import { db } from '$lib/server/db';
```

в клиентском компоненте.

Правильно:

```ts
// +page.server.ts
import { getProjects } from '$lib/server/services/project.service';

export const load = async ({ locals }) => {
	return {
		projects: await getProjects(locals.user.id)
	};
};
```

Компонент получает готовые данные:

```svelte
<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>
```

---

## 4. `load`-функции

`load` должен быть тонким слоем между роутом и бизнес-логикой.

Хороший `load`:

- проверяет доступ;
- вызывает сервис;
- возвращает данные странице;
- не содержит сложной бизнес-логики;
- не форматирует данные ради UI, если это можно сделать в компоненте;
- не делает 5 разных вещей одновременно.

Плохо:

```ts
export const load = async ({ locals, params }) => {
  const user = await db.user.findUnique(...);
  const projects = await db.project.findMany(...);
  const result = projects.map(...);
  const permissions = ...;
  const billing = ...;

  return { ... };
};
```

Лучше:

```ts
export const load = async ({ locals }) => {
	const dashboard = await getDashboardData(locals.user.id);

	return {
		dashboard
	};
};
```

---

## 5. Form Actions

Для обычных форм используй SvelteKit actions, а не ручной `fetch`, если нет веской причины.

Правильно:

```ts
// +page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { createProjectSchema } from '$lib/schemas/project.schema';
import { createProject } from '$lib/server/services/project.service';

export const actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();
		const parsed = createProjectSchema.safeParse(Object.fromEntries(formData));

		if (!parsed.success) {
			return fail(400, {
				errors: parsed.error.flatten().fieldErrors
			});
		}

		await createProject(locals.user.id, parsed.data);

		throw redirect(303, '/dashboard/projects');
	}
};
```

Правила:

- валидация всегда на сервере;
- клиентская валидация — только для UX, не для безопасности;
- action не должен напрямую содержать большую бизнес-логику;
- ошибки возвращай через `fail`;
- после успешного мутационного действия обычно используй `redirect`;
- `use:enhance` добавляй только когда нужен улучшенный UX.

---

## 6. API routes

Не создавай `+server.ts` для всего подряд.

Используй `+server.ts`, если:

- нужен публичный JSON API;
- нужен webhook;
- нужен endpoint для внешнего клиента;
- нужна загрузка файлов;
- нужна интеграция не через обычную HTML-форму.

Не используй `+server.ts`, если обычная страница с формой спокойно решается через actions.

---

## 7. Бизнес-логика

Бизнес-логика живёт в сервисах.

```txt
$lib/server/services/project.service.ts
$lib/server/repositories/project.repository.ts
```

Сервис отвечает за правила:

```ts
export async function createProject(userId: string, input: CreateProjectInput) {
	const canCreate = await canUserCreateProject(userId);

	if (!canCreate) {
		throw new AppError('PROJECT_LIMIT_REACHED');
	}

	return projectRepository.create({
		ownerId: userId,
		...input
	});
}
```

Репозиторий отвечает за доступ к данным:

```ts
export const projectRepository = {
	findByUser(userId: string) {
		return db.project.findMany({
			where: { ownerId: userId }
		});
	}
};
```

Правила:

- сервис не должен знать детали UI;
- UI не должен знать детали БД;
- repository не должен принимать `Request`, `FormData`, `locals`;
- action/load не должны содержать SQL/Prisma-логику напрямую, если операция не тривиальная.

---

## 8. Типизация

TypeScript должен помогать, а не быть декорацией.

Правила:

- не используй `any`, кроме действительно крайних случаев;
- не дублируй типы, если их можно вывести из схемы;
- используй типы SvelteKit из `./$types`;
- входные данные валидируй Zod-схемами;
- типы DTO держи рядом со схемами или сервисами.

Пример:

```ts
export const createProjectSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional()
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
```

---

## 9. Компоненты

Компонент должен быть маленьким и понятным.

Хороший компонент:

- принимает данные через props;
- не ходит сам в БД;
- не знает про бизнес-правила;
- не содержит огромных условий;
- не смешивает форму, таблицу, модалку и загрузку данных в одном файле.

Плохо:

```svelte
<ProjectDashboardEverything />
```

Лучше:

```svelte
<ProjectHeader />
<ProjectFilters />
<ProjectTable />
<CreateProjectDialog />
```

Правила:

- если компонент используется только на одной странице — держи его рядом с этой страницей;
- если компонент переиспользуемый — клади в `$lib/components`;
- UI-компоненты не должны импортировать серверный код;
- не создавай «универсальный компонент на все случаи жизни»;
- лучше 3 простых компонента, чем 1 компонент с 20 props.

---

## 10. State management

Не тащи глобальный store туда, где достаточно props или `load`.

Используй по приоритету:

1. локальное состояние компонента;
2. props;
3. данные из `load`;
4. derived state;
5. store только для реально общего клиентского состояния.

Store подходит для:

- темы;
- состояния sidebar;
- временного UI-состояния;
- client-only настроек;
- общего wizard-состояния.

Store не должен быть заменой серверным данным.

Нельзя хранить в глобальном store:

- текущего пользователя как источник истины;
- права доступа;
- серверные сущности, которые должны обновляться через invalidation;
- секреты;
- данные, которые должны быть получены через `load`.

---

## 11. Ошибки

Ошибки должны быть явными.

Правила:

- ожидаемые ошибки обрабатывай явно;
- не глотай ошибки пустым `catch`;
- не возвращай пользователю внутренние сообщения БД;
- для доменных ошибок используй понятные коды;
- логируй техническую причину, пользователю показывай безопасный текст.

Пример:

```ts
try {
	await createProject(userId, input);
} catch (error) {
	if (error instanceof AppError) {
		return fail(400, {
			message: getPublicErrorMessage(error.code)
		});
	}

	console.error(error);

	return fail(500, {
		message: 'Unexpected server error'
	});
}
```

---

## 12. Валидация

Валидация должна быть единой.

Правила:

- не валидируй одно и то же вручную в разных местах;
- схема должна быть рядом с доменной сущностью;
- все внешние входные данные проходят через schema parsing;
- `FormData` сразу преобразуется в типизированный input;
- не доверяй данным с клиента.

---

## 13. Авторизация

Авторизация проверяется на сервере.

Правила:

- `locals.user` — источник информации о текущем пользователе;
- доступ проверяется в `load`, actions, API routes или сервисах;
- не полагайся на скрытую кнопку в UI;
- если пользователь не имеет доступа — сервер должен отказать;
- layout-level guard допустим, но доменные проверки всё равно нужны ближе к операции.

Пример:

```ts
export const load = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
};
```

---

## 14. Работа с данными

Не делай хаотичные `fetch` из компонентов.

Правила:

- начальные данные страницы грузятся через `load`;
- мутации идут через actions или осознанный API endpoint;
- после мутации обновляй данные через redirect, invalidate или form enhancement;
- избегай дублирования одного и того же запроса в нескольких компонентах;
- не делай N+1 запросы из UI-компонентов.

---

## 15. Архитектурные запреты

Агент не должен:

- писать костыли «на потом поправим»;
- создавать абстракции до появления повторения;
- делать глобальный store для всего;
- смешивать серверный и клиентский код;
- импортировать `$lib/server` в UI;
- писать бизнес-логику внутри `.svelte`;
- создавать огромные `+page.server.ts`;
- плодить `utils.ts` без смысла;
- использовать `any`;
- делать ручной `fetch`, когда достаточно form actions;
- городить event bus без необходимости;
- создавать service locator, DI-container или framework-like слой без явной причины;
- прятать ошибки;
- писать код, который сложно удалить.

---

## 16. Когда создавать абстракцию

Создавай абстракцию только если:

- есть минимум 2–3 реальных повторения;
- понятно, что именно обобщается;
- абстракция уменьшает код, а не увеличивает;
- название абстракции очевидно;
- её можно объяснить одним предложением.

Не создавай абстракцию «на будущее».

Плохо:

```ts
createUniversalEntityOperationHandlerFactory();
```

Хорошо:

```ts
createProject();
updateProject();
deleteProject();
```

---

## 17. Именование

Имена должны объяснять смысл.

Правила:

- `getUserProjects` лучше, чем `getData`;
- `createProjectSchema` лучше, чем `schema`;
- `ProjectTable` лучше, чем `TableComponent`;
- `isProjectOwner` лучше, чем `check`;
- не используй сокращения без необходимости;
- не называй всё `manager`, `handler`, `helper`.

---

## 18. Минимальный правильный flow для страницы

Для страницы со списком и созданием сущности:

```txt
routes/projects/+page.server.ts
routes/projects/+page.svelte
routes/projects/components/ProjectTable.svelte
routes/projects/components/CreateProjectForm.svelte

lib/server/services/project.service.ts
lib/server/repositories/project.repository.ts
lib/schemas/project.schema.ts
```

`+page.server.ts`:

```ts
export const load = async ({ locals }) => {
	return {
		projects: await getUserProjects(locals.user.id)
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		const input = await parseFormData(request, createProjectSchema);
		await createProject(locals.user.id, input);
		throw redirect(303, '/projects');
	}
};
```

`+page.svelte`:

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import ProjectTable from './components/ProjectTable.svelte';
	import CreateProjectForm from './components/CreateProjectForm.svelte';

	let { data }: { data: PageData } = $props();
</script>

<CreateProjectForm />
<ProjectTable projects={data.projects} />
```

---

## 19. Проверочный список перед коммитом

Перед тем как считать задачу готовой, агент обязан проверить:

- нет ли `any`;
- нет ли серверного импорта в клиентском коде;
- нет ли бизнес-логики в `.svelte`;
- нет ли огромного компонента, который стоит разбить;
- нет ли дублирующейся валидации;
- нет ли неиспользуемой абстракции;
- нет ли ручного `fetch`, который лучше заменить action/load;
- понятны ли имена файлов и функций;
- обработаны ли ошибки;
- проверена ли авторизация на сервере;
- можно ли удалить фичу без переписывания половины проекта.

---

## 20. Главная эвристика

Если решение выглядит «умным», но его сложно объяснить — это плохое решение.

Идеальный SvelteKit-код обычно скучный:

- route получает данные;
- server service выполняет бизнес-логику;
- repository работает с БД;
- schema валидирует input;
- component отображает UI;
- action обрабатывает форму.

Скучный код легче читать, тестировать, удалять и расширять.
