import { ContentStatus, Prisma } from "@prisma/client";
import type { CropKind } from "@growing/contracts";
import { GUIDE_TAXONOMY_TAG_KEYS_BY_SLUG } from "./seed-taxonomy-tags";
import {
  createContentPrisma,
  type ContentMigrationPrisma,
} from "./content-prisma-for-migration";
import { createTaxonomyPrisma } from "./taxonomy-prisma-for-migration";

async function resolveTaxonomyTagIdsByKeys(
  keys: string[],
): Promise<Array<{ id: string; key: string }>> {
  if (keys.length === 0) return [];
  const url = process.env.TAXONOMY_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "TAXONOMY_DATABASE_URL is required to link guide taxonomy tags (run services/taxonomy db:seed first)",
    );
  }
  const taxonomy = createTaxonomyPrisma(url);
  try {
    const tags = await taxonomy.taxonomyTag.findMany({
      where: { key: { in: keys } },
      select: { id: true, key: true },
    });
    const byKey = new Map(tags.map(t => [t.key, t]));
    const missing = keys.filter(key => !byKey.has(key));
    if (missing.length > 0) {
      throw new Error(`taxonomy tag keys not found: ${missing.join(", ")}`);
    }
    return keys.map(key => {
      const tag = byKey.get(key)!;
      return { id: tag.id, key: tag.key };
    });
  } finally {
    await taxonomy.$disconnect();
  }
}

type TSeedGuide = {
  cropKind: CropKind;
  slug: string;
  title: string;
  excerpt: string;
  sortOrder: number;
  body: Prisma.InputJsonValue;
  bodySiteMd?: string;
  bodyTelegramMd?: string;
};

const GUIDES: TSeedGuide[] = [
  {
    cropKind: "TOMATO",
    slug: "vyrashchivanie-tomatov",
    title: "Выращивание Томатов",
    excerpt:
      "Общий обзор выращивания помидоров: от рассады до сбора урожая — условия, полив, подкормки и типичные ошибки.",
    sortOrder: 1,
    body: [
      {
        type: "taxonomy",
        scope: "overview",
        terms: [
          { key: "crop:tomato", label: "Томаты" },
          { key: "topic:growing", label: "Выращивание" },
        ],
      },
      { type: "heading", level: 2, text: "Введение" },
      {
        type: "paragraph",
        text: "Томат (Solanum lycopersicum) — одна из самых популярных овощных культур в частных и промышленных теплицах. Независимо от сорта и типа роста, помидоры требуют яркого света, стабильной температуры, сбалансированного полива и регулярной вентиляции. Этот материал описывает общие принципы, применимые к большинству сортов: детерминантным, индетерминантным и полудетерминантным.",
      },
      { type: "heading", level: 2, text: "Условия выращивания" },
      {
        type: "paragraph",
        text: "Оптимальная температура для роста — 22–26°C днём и 16–18°C ночью. При температуре ниже 12°C развитие замедляется, цветение может сбрасываться. Световой день для полноценной вегетации и завязи плодов — не менее 14–16 часов; при недостатке освещения рассада вытягивается, а взрослые растения дают редкие соцветия.",
      },
      {
        type: "tip",
        text: "Для рассады используйте досветку LED-лампами с красно-синим спектром: 200–300 мкмоль/м²·с на высоте 30–40 см над верхушками листьев.",
      },
      { type: "heading", level: 2, text: "Посев и рассада" },
      {
        type: "paragraph",
        text: "Семена высевают за 6–8 недель до высадки в постоянное место. Глубина заделки — 0,5–1 см. После появления первых настоящих листьев рассаду пикируют в отдельные ёмкости объёмом 0,3–0,5 л. За 7–10 дней до пересадки начинают закаливание: постепенно снижают температуру и увеличивают проветривание.",
      },
      {
        type: "checklist",
        items: [
          "Субстрат лёгкий, с pH 6,0–6,5",
          "Полив тёплой водой, без застоя",
          "Подкормка 1–2 раза слабым раствором комплексного удобрения",
          "Один раз опрыскивание микроэлементами при 3–4 настоящих листах",
        ],
      },
      { type: "heading", level: 2, text: "Высадка и уход" },
      {
        type: "paragraph",
        text: "На постоянное место пересаживают, когда минимальная ночная температура стабильно выше 10°C, а растения имеют 6–8 настоящих листьев. Расстояние между кустами зависит от типа: компактные детерминантные — 40–50 см, высокорослые индетерминантные — 50–70 см. После высадки первые 2 недели полив умеренный, затем переходят на регулярный режим: подсыхание верхнего слоя субстрата между поливами, но без длительной засухи.",
      },
      {
        type: "warning",
        text: "Резкие перепады влажности и недостаток кальция часто приводят к вершинной гнили плодов. Поддерживайте равномерный полив и при необходимости вносите кальциевые подкормки.",
      },
      { type: "heading", level: 2, text: "Подкормки и формирование" },
      {
        type: "paragraph",
        text: "На вегетации удобно использовать удобрения с повышенным содержанием азота; с началом цветения — с акцентом на фосфор и калий. Формирование куста зависит от типа роста: индетерминантные требуют пасынкования и подвязки к опоре, детерминантные обычно формируют в 1–2 стебля без активного удаления боковых побегов после формирования соцветий. Мульчирование субстрата снижает испарение и стабилизирует температуру корней.",
      },
      { type: "heading", level: 2, text: "Сбор урожая" },
      {
        type: "paragraph",
        text: "Плоды снимают по мере достижения сортовой окраски и плотности. Для длительного хранения допустим сбор на стадии breaker (начало окраски), дозревание проходит при комнатной температуре. Регулярный сбор стимулирует образование новых завязей.",
      },
    ],
  },
  {
    cropKind: "TOMATO",
    slug: "vyrashchivanie-determinantnyh-tomatov",
    title: "Выращивание Детерминантных томатов",
    excerpt:
      "Особенности компактных детерминантных сортов: формирование куста, густота посадки, полив и урожайность без пасынкования.",
    sortOrder: 2,
    body: [
      {
        type: "taxonomy",
        scope: "variant",
        terms: [
          { key: "crop:tomato", label: "Томаты" },
          { key: "crop_variant:tomato.determinate", label: "Детерминантные" },
          { key: "topic:growing", label: "Выращивание" },
        ],
      },
      { type: "heading", level: 2, text: "Чем отличаются детерминантные томаты" },
      {
        type: "paragraph",
        text: "Детерминантные (компактные) сорта томатов имеют генетически ограниченный рост: после формирования 3–5 соцветий точка роста главного стебля прекращает активное удлинение. Куст остаётся невысоким — обычно 60–120 см — и быстрее переходит к массовому плодоношению. Такие сорта удобны для открытого грунта, балконов, низких теплиц и там, где не нужна сложная шпалерная система.",
      },
      { type: "heading", level: 2, text: "Выбор сорта и посадка" },
      {
        type: "paragraph",
        text: "Для детерминантных сортов критична густота: слишком редкая посадка не окупает площадь, слишком густая — провоцирует грибковые заболевания. Ориентир — 4–6 растений на 1 м² в теплице или 3–4 растения на 1 м² в открытом грунте при ширине грядки 80–100 см. Высадку проводят на ту же глубину, что и в горшке, слегка утрамбовывая субстрат вокруг корневой шейки.",
      },
      {
        type: "tip",
        text: "Детерминантные сорта часто созревают раньше индетерминантных — планируйте последовательный посев, чтобы получить два волны урожая за сезон.",
      },
      { type: "heading", level: 2, text: "Формирование куста" },
      {
        type: "paragraph",
        text: "Классическое пасынкование для детерминантных сортов минимально. Обычно удаляют только нижние листья, касающиеся субстрата, и слабые побеги в пазухах первых 1–2 листьев. Некоторые садоводы формируют куст в один стебель для раннего урожая или оставляют 2–3 стебля для увеличения общей массы плодов. Главное правило — не перегружать растение листвой: нижнюю треть куста постепенно освобождают от листьев после появления первых созревающих плодов.",
      },
      {
        type: "checklist",
        items: [
          "Подвязка короткого стебля к колышку — только при тяжёлых гроздьях",
          "Удаление пожелтевших нижних листьев",
          "Без активного пасынкования после 3-го соцветия",
          "Проветривание теплицы утром и вечером",
        ],
      },
      { type: "heading", level: 2, text: "Полив и питание" },
      {
        type: "paragraph",
        text: "Компактный куст быстрее закрывает почву листьями и меньше теряет влагу испарением с поверхности, но корневая система у детерминантных сортов обычно менее глубокая. Полив — частый, но умеренный: лучше капельная линия с равномерной подачей, чем редкие обильные заливы. На этапе массового плодоношения снижают азот и увеличивают долю калия — это улучшает вкус и снижает риск растрескивания плодов.",
      },
      {
        type: "warning",
        text: "Избыток азота на детерминантных сортах даёт густую листву и задерживает созревание гроздей. Переключайте схему подкормки сразу после массового цветения.",
      },
      { type: "heading", level: 2, text: "Урожай и типичные ошибки" },
      {
        type: "paragraph",
        text: "Детерминантные сорта дают основной урожай за 3–5 недель, после чего плодоношение постепенно снижается. Чтобы продлить сезон, можно оставить 1–2 верхних цветка и лёгкую подкормку, но ожидать такого же объёма, как у индетерминантных, не стоит. Частые ошибки: излишняя густота посадки, пасынкование по правилам для высокорослых сортов, недостаток кальция при интенсивном плодоношении и поздний полив в жаркие дни, что ведёт к ожогам плодов на солнце.",
      },
    ],
  },
  {
    cropKind: "TOMATO",
    slug: "interesnye-fakty-determinantnye-tomaty",
    title: "Интересные факты о детерминантных помидорах",
    excerpt:
      "12 неочевидных фактов о компактных томатах: генетика, урожайность, история сортов и практические хитрости для садовода.",
    sortOrder: 3,
    body: [
      {
        type: "taxonomy",
        scope: "howto",
        terms: [
          { key: "crop:tomato", label: "Томаты" },
          { key: "crop_variant:tomato.determinate", label: "Детерминантные" },
          { key: "topic:facts", label: "Интересные факты" },
        ],
      },
      {
        type: "paragraph",
        text: "Детерминантные помидоры — не просто «низкорослые» томаты. За компактной формой стоят конкретные гены, история селекции и особенности агротехники. Собрали факты, которые помогут лучше понять культуру и вырастить более щедрый урожай.",
      },
      {
        type: "factCards",
        title: "12 фактов о выращивании детерминантных томатов",
        subtitle:
          "От генетики роста до плотности посадки — короткие заметки с фото для тех, кто выращивает компактные сорта на балконе, в теплице или в открытом грунте.",
        heroImage: {
          url: "https://images.unsplash.com/photo-1592924357224-548917444334?auto=format&fit=crop&w=800&q=80",
          alt: "Спелые красные помидоры на ветке",
        },
        items: [
          {
            title: "Ген, который «останавливает» рост",
            text: "Детерминантность связана с аллелем sp (self-pruning): после формирования нескольких соцветий точка роста главного стебля прекращает удлинение. Именно поэтому куст остаётся компактным без постоянного пасынкования.",
            iconVariant: "red",
            image: {
              url: "https://images.unsplash.com/photo-1566385101042-f43462f04738?auto=format&fit=crop&w=640&q=80",
              alt: "Куст томата с зелёными плодами",
            },
          },
          {
            title: "Созданы для механизированного сбора",
            text: "Массовое использование детерминантных линий в промышленности началось в XX веке: растения созревают примерно в одно время, что удобно для машинного или бригадного сбора урожая.",
            iconVariant: "orange",
            image: {
              url: "https://images.unsplash.com/photo-151897767896-557c6672713b?auto=format&fit=crop&w=640&q=80",
              alt: "Грядка с томатами в поле",
            },
          },
          {
            title: "Идеальны для балкона и малого пространства",
            text: "Большинство детерминантных сортов не превышает 60–120 см. Их можно выращивать в крупных горшках объёмом 10–15 л на южном балконе или в низкой теплице без многоярусной шпалеры.",
            iconVariant: "cherry",
            image: {
              url: "https://images.unsplash.com/photo-1464226183347-ce312f45d73f?auto=format&fit=crop&w=640&q=80",
              alt: "Овощи и помидоры на столе",
            },
          },
          {
            title: "Концентрированная «волна» урожая",
            text: "До 70–80% плодов детерминантного куста созревают за 3–5 недель. Это удобно для консервации и переработки, но после пика плодоношение заметно снижается.",
            iconVariant: "red",
            image: {
              url: "https://images.unsplash.com/photo-1546094097-3c8175665543?auto=format&fit=crop&w=640&q=80",
              alt: "Спелые помидоры крупным планом",
            },
          },
          {
            title: "Меньше пасынков — меньше работы",
            text: "В отличие от индетерминантных, здесь почти не нужно еженедельное пасынкование. Обычно достаточно удалить нижние листья и слабые побеги у основания — экономия 2–3 часов ухода на куст за сезон.",
            iconVariant: "green",
            image: {
              url: "https://images.unsplash.com/photo-159284006266-2fbf1a7f4c8e?auto=format&fit=crop&w=640&q=80",
              alt: "Зелёные томаты на кусте",
            },
          },
          {
            title: "Быстрее выходят в цветение",
            text: "При одинаковых условиях многие детерминантные сорта закладывают первое соцветие раньше высокорослых. Это особенно ценно в регионах с коротким летом.",
            iconVariant: "cherry",
            image: {
              url: "https://images.unsplash.com/photo-1571771019611-5544a603c427?auto=format&fit=crop&w=640&q=80",
              alt: "Красные томаты на грядке",
            },
          },
          {
            title: "Корни не уходят так глубоко",
            text: "Корневая система компактных сортов обычно менее глубокая, чем у индетерминантных. Капельный полив и мульча особенно эффективны — влага остаётся в зоне корней, а не уходит в нижние слои.",
            iconVariant: "green",
            image: {
              url: "https://images.unsplash.com/photo-1530581279092-0625106674b8?auto=format&fit=crop&w=640&q=80",
              alt: "Сбор урожая помидоров",
            },
          },
          {
            title: "Густота посадки имеет значение",
            text: "В теплице допустимо 4–6 растений на 1 м² при хорошей вентиляции. В открытом грунте — 3–4 растения на м². Излишняя густота провоцирует фитофтору и задержку созревания.",
            iconVariant: "orange",
            image: {
              url: "https://images.unsplash.com/photo-1592417817091-403e0e9a977e?auto=format&fit=crop&w=640&q=80",
              alt: "Ряды томатов в теплице",
            },
          },
          {
            title: "Классика селекции: «Балконное чудо»",
            text: "Один из самых известных детерминантных сортов в СНГ — «Балконное чудо». Его вывели для контейнерного выращивания; куст редко превышает 50 см, а первые плоды созревают через 85–95 дней после всходов.",
            iconVariant: "red",
            image: {
              url: "https://images.unsplash.com/photo-1607301407290-0a0015097924?auto=format&fit=crop&w=640&q=80",
              alt: "Мелкие красные томаты черри",
            },
          },
          {
            title: "Азот «зеленит», калий «краснит»",
            text: "Избыток азота на этапе плодоношения даёт густую листву и задерживает окраску плодов. Детерминантные сорта особенно чувствительны — после массового цветения переключайтесь на подкормки с повышенным содержанием калия.",
            iconVariant: "green",
            image: {
              url: "https://images.unsplash.com/photo-1592924357224-548917444334?auto=format&fit=crop&w=640&q=80",
              alt: "Нарезанные спелые помидоры",
            },
          },
          {
            title: "Низкий куст — меньше риска для верхней листвы",
            text: "При правильном проветривании и своевременном удалении нижних листьев детерминантные томаты реже страдают от поражения верхней части куста грибковыми заболеваниями по сравнению с высокорослыми шпалерными посадками.",
            iconVariant: "cherry",
            image: {
              url: "https://images.unsplash.com/photo-1566385101042-f43462f04738?auto=format&fit=crop&w=640&q=80",
              alt: "Растущие томаты на кусте",
            },
          },
          {
            title: "Два посева — два урожая",
            text: "Высадите первую партию в начале мая, вторую — через 3 недели. Пока первые кусты отдают основной урожай, вторая партия только выходит на пик плодоношения — так можно растянуть сезон без теплицы с подогревом.",
            iconVariant: "orange",
            image: {
              url: "https://images.unsplash.com/photo-151897767896-557c6672713b?auto=format&fit=crop&w=640&q=80",
              alt: "Томатная грядка на солнце",
            },
          },
        ],
      },
      {
        type: "tip",
        text: "Хотите углубиться в агротехнику? Прочитайте материал «Выращивание детерминантных томатов» — там подробнее про полив, формирование куста и типичные ошибки.",
      },
    ],
  },
  {
    cropKind: "ZUCCHINI",
    slug: "kabachki",
    title: "Кабачки",
    excerpt: "Компактные кусты, щедрый урожай и простой уход в тепле.",
    sortOrder: 4,
    body: [
      { type: "heading", level: 2, text: "Посадка" },
      {
        type: "paragraph",
        text: "Кабачки быстро набирают массу листьев. Оставляйте достаточно пространства между растениями и следите за опылением.",
      },
      {
        type: "warning",
        text: "Избыток азота даёт листву вместо плодов — не перекармливайте на вегетации.",
      },
    ],
  },
  {
    cropKind: "EGGPLANT",
    slug: "baklazhany",
    title: "Баклажаны",
    excerpt: "Тепло, подвязка и стабильная влажность субстрата.",
    sortOrder: 5,
    body: [
      { type: "heading", level: 2, text: "Температура и свет" },
      {
        type: "paragraph",
        text: "Баклажаны чувствительны к перепадам температуры. Держите ночную температуру не ниже 18°C и обеспечьте равномерное освещение.",
      },
    ],
  },
  {
    cropKind: "CUCUMBER",
    slug: "ogurcy",
    title: "Огурцы",
    excerpt: "Высокая влажность воздуха, частый полив и своевременная подвязка.",
    sortOrder: 6,
    body: [
      { type: "heading", level: 2, text: "Полив" },
      {
        type: "paragraph",
        text: "Огурцы быстро реагируют на нехватку влаги — листья могут вянуть уже через несколько часов. Используйте mulching или капельный полив.",
      },
      {
        type: "checklist",
        items: [
          "Подвязка основного стебля",
          "Удаление нижних листьев у субстрата",
          "Проветривание без сквозняка",
        ],
      },
    ],
  },
];

/** CONTENT-LCH-3 / CONTENT-BRD-4 — launch guides with site + Telegram MD (пакет A). */
const LAUNCH_GUIDES: TSeedGuide[] = [
  {
    cropKind: "TOMATO",
    slug: "tomato-outdoor-bed-start",
    title: "Выращивание помидоров на грядке: старт сезона",
    excerpt:
      "Когда высаживать рассаду в открытый грунт, как подготовить грядку и не залить куст в первую неделю.",
    sortOrder: 10,
    body: [],
    bodySiteMd: `# Выращивание помидоров на грядке: старт сезона

Открытый грунт даёт вкус и аромат, которых сложно добиться в теплице — но только если вовремя высадить рассаду и не промахнуться с поливом в первые недели.

## Когда высаживать

Ориентир — стабильные ночи **выше +10…12 °C** и прогретая почва на глубине 10 см. В средней полосе это обычно вторая половина мая — начало июня; в более тёплых регионах — раньше на 1–2 недели.

За 7–10 дней до высадки закаляйте рассаду: короткие прогулки на улице, затем дольше, без резкого солнца в полдень.

## Подготовка грядки

- Солнечное место, без застоя воды.
- Рыхлый субстрат, pH около **6,0–6,5**.
- Перед посадкой внесите компост или перегной; свежий навоз — нет.
- Схема: **40–50 см** между компактными кустами, **50–70 см** для высокорослых.

## Посадка

1. Лунка чуть глубже горшка — можно заглубить стебель на 2–3 см (дополнительные корни).
2. Полейте тёплой водой, замульчируйте.
3. Первые **5–7 дней** — притенение от жёсткого солнца, если стоит жара.

## Полив и уход в старте

Пока куст приживается, полив **умеренный**: верхний слой подсыхает, но ком не пересыхает насквозь. Резкие заливы после засухи провоцируют трещины плодов позже в сезоне.

Подвяжите индетерминантные сорта сразу — не ждите, пока стебель ляжет.

## Частые ошибки

| Ошибка | Что делать |
|--------|------------|
| Высадка «в холод» | Подождать или укрыть спанбондом на ночь |
| Густая посадка | Проредить / формировать, усилить проветривание |
| Ежедневный обильный полив | Перейти на редкий, но глубокий |

## Дальше

После укоренения — регулярный полив, первая подкормка через 10–14 дней и формирование куста под ваш тип сорта. Полный цикл от рассады до сбора — в связанных гайдах SmartБотаник.
`,
    bodyTelegramMd: `🌱 Помидоры на грядке: старт сезона

Когда высаживать, как подготовить грядку и не залить куст в первую неделю — короткий чеклист для открытого грунта.

• Ночи стабильно выше +10…12 °C
• Схема посадки 40–70 см в зависимости от типа куста
• Умеренный полив и мульча после высадки

📖 Полная статья: https://smart-botanik.ru/guides/tomato-outdoor-bed-start
`,
  },
  {
    cropKind: "TOMATO",
    slug: "growbox-light-ventilation",
    title: "Гроубокс: свет и вентиляция без перегрева",
    excerpt:
      "Как подобрать свет и два контура воздуха в закрытом объёме, чтобы не сжечь листья и не поймать плесень.",
    sortOrder: 11,
    body: [],
    bodySiteMd: `# Гроубокс: свет и вентиляция без перегрева

В закрытом объёме свет и воздух связаны: мощная лампа без вытяжки быстро поднимает температуру листьев, а слабый обдув даёт плесень и вытянутую рассаду.

## Свет: сколько нужно

Для большинства овощных культур в вегетации ориентир **PPFD 200–400 мкмоль/м²·с** на уровне кроны (точные цифры зависят от культуры и фазы).

Практические правила:

- Держите лампу на рекомендованной производителем высоте; при «ожоге» листьев — поднимите или снизьте мощность.
- Фотопериод для рассады овощей часто **14–16 ч**; ночная пауза обязательна.
- Белый / full-spectrum LED проще в быту, чем узкий «красный-синий», если вы не гонитесь за максимальной эффективностью ватт.

## Вентиляция: два контура

1. **Вытяжка** — удаляет нагретый воздух и снижает влажность.
2. **Циркуляция** внутри бокса — лёгкий ветер по листьям, без прямого «фена» на точку роста.

Без вытяжки температура под лампой может быть на **5–10 °C** выше, чем показывает датчик у стенки.

## Как не перегреть

| Симптом | Вероятная причина | Действие |
|---------|-------------------|----------|
| Листья «лодочкой», края сухие | Слишком близко / жарко | Поднять лампу, усилить вытяжку |
| Вытянутые стебли | Мало света или слишком тепло ночью | Ближе лампа / длиннее день, прохладнее ночь |
| Конденсат на стенках | Слабая вытяжка, высокая RH | Увеличить воздухообмен |

Целевой диапазон для многих культур: **22–26 °C** днём, ночь на **3–5 °C** ниже; относительная влажность **50–70 %** (ниже на цветении/плодах — меньше грибков).

## Минимальный чеклист перед запуском

- [ ] Вытяжной вентилятор с запасом по объёму бокса
- [ ] Отверстие притока (не только вытяжка)
- [ ] Датчик температуры **у кроны**, не только у пола
- [ ] Таймер света и проверка ночной паузы

## Связь с приложением

В SmartБотаник локация типа «гроубокс» и события полива/климата помогут вести историю среды — приложение в разработке; пока фиксируйте показания датчиков рядом с этим гайдом.
`,
    bodyTelegramMd: `🌱 Гроубокс: свет и вентиляция без перегрева

Лампа без вытяжки греет листья сильнее, чем кажется. Коротко — как подобрать PPFD, два контура воздуха и не поймать ожог.

• PPFD ориентир 200–400 мкмоль/м²·с у кроны
• Вытяжка + лёгкая циркуляция внутри
• Датчик температуры держите у листьев, не у пола

📖 Полная статья: https://smart-botanik.ru/guides/growbox-light-ventilation
`,
  },
];

const ALL_SEED_GUIDES: TSeedGuide[] = [...GUIDES, ...LAUNCH_GUIDES];

const HOME_SECTIONS: Prisma.InputJsonValue = [
  {
    type: "hero",
    title: "SmartБотаник",
    subtitle:
      "Гайды по выращиванию и пост-урожаю. Приложение для дневника сада — скоро; пока читайте статьи и подписывайтесь на Telegram.",
    ctaLabel: "Смотреть гайды",
    ctaHref: "/guides",
  },
  {
    type: "telegramBlock",
    title: "Telegram-канал SmartБотаник",
    text: "Короткие советы, анонсы новых гайдов и ссылки на полные статьи на сайте. Закреплённый пост — о чём канал и куда идти за материалами.",
    channelUrl: "https://t.me/smart_botanik",
    buttonLabel: "Подписаться на канал",
  },
  {
    type: "cultureChips",
    title: "Культуры",
    subtitle: "Гайды и материалы по основным культурам — от рассады до урожая.",
    cultureTagKeys: ["crop.tomato", "crop.cucumber", "crop.pepper", "crop.potato"],
  },
  {
    type: "featuredGuides",
    cropKinds: ["TOMATO", "ZUCCHINI", "EGGPLANT", "CUCUMBER"],
  },
  {
    type: "ctaBlock",
    title: "Приложение в разработке",
    text: "Дневник локаций, растений и метрик появится позже. Сейчас — гайды на сайте и анонсы в Telegram.",
    ctaLabel: "Читать гайды",
    ctaHref: "/guides",
  },
];

/** Public `/calendar` — moon | seasons + lunar howto (SITE-CAL-1 / BK-CONTENT-CAL-1). */
const CALENDAR_SECTIONS: Prisma.InputJsonValue = [
  {
    type: "calendarIntro",
    title: "Календарь",
    subtitle:
      "Лунный и сезонный календари для работ в саду. Выберите режим — подсказки и данные ниже.",
    defaultMode: "moon",
  },
  {
    type: "calendarMode",
    mode: "moon",
    label: "Лунный календарь",
    descriptionMd:
      "Фазы Луны и краткие подсказки по дням. Данные редактируются в админке (Контент → Календарь).",
    data: {
      year: 2026,
      entries: [
        {
          date: "2026-07-21",
          phase: "new",
          note: "Пример записи — замените на актуальные фазы.",
        },
        {
          date: "2026-08-05",
          phase: "full",
          note: "Полнолуние (пример).",
        },
      ],
    },
  },
  {
    type: "calendarMode",
    mode: "seasons",
    label: "Сезонный календарь",
    descriptionMd:
      "Окна сезонов и сезонные работы. Данные редактируются в админке.",
    data: {
      year: 2026,
      seasons: [
        {
          id: "spring",
          label: "Весна",
          start: "2026-03-01",
          end: "2026-05-31",
          note: "Рассада, посадка, первые подкормки.",
        },
        {
          id: "summer",
          label: "Лето",
          start: "2026-06-01",
          end: "2026-08-31",
          note: "Полив, формирование, сбор.",
        },
        {
          id: "autumn",
          label: "Осень",
          start: "2026-09-01",
          end: "2026-11-30",
          note: "Уборка, закрутка, подготовка к зиме.",
        },
        {
          id: "winter",
          label: "Зима",
          start: "2026-12-01",
          end: "2027-02-28",
          note: "Планирование сезона, семена, инвентарь.",
        },
      ],
    },
  },
  {
    type: "calendarLunarGuide",
    title: "Как пользоваться лунным календарём",
    subtitle: "Кратко о фазах, подкормках и знаках зодиака для посева.",
    phases: [
      {
        id: "new",
        label: "Новолуние",
        imageSrc: "/calendar/moon-phase-new.svg",
        body: "Худшее время для посадок: не сажайте и не пересаживайте. Неблагоприятны три дня — день до, новолуние и день после.",
      },
      {
        id: "waxing",
        label: "Растущая Луна",
        imageSrc: "/calendar/moon-phase-waxing.svg",
        body: "Соки тянутся вверх — лучшее время для надземных культур (зелень, травы, фрукты, овощи, цветы): посадка, пересадка, прививка.",
      },
      {
        id: "full",
        label: "Полнолуние",
        imageSrc: "/calendar/moon-phase-full.svg",
        body: "Один день без посадок и пересадок. Можно полоть, подкармливать и обрабатывать от вредителей.",
      },
      {
        id: "waning",
        label: "Убывающая Луна",
        imageSrc: "/calendar/moon-phase-waning.svg",
        body: "Энергия к корням — работайте с корнеплодами и луковичными.",
      },
    ],
    tips: [
      "Сажайте на рассвете или до обеда.",
      "На растущей Луне — минеральные подкормки; на убывающей — органические.",
    ],
    zodiacGroups: [
      {
        id: "fertile",
        label: "Плодородные",
        signs: [
          { symbol: "♋", name: "Рак" },
          { symbol: "♉", name: "Телец" },
          { symbol: "♏", name: "Скорпион" },
          { symbol: "♓", name: "Рыбы" },
        ],
        body: "Лучшие дни для посева и посадки — всходы сильнее, урожай выше.",
      },
      {
        id: "neutral",
        label: "Нейтральные",
        signs: [
          { symbol: "♍", name: "Дева" },
          { symbol: "♐", name: "Стрелец" },
          { symbol: "♎", name: "Весы" },
          { symbol: "♑", name: "Козерог" },
        ],
        body: "Сеять и сажать можно, урожай скорее средний.",
      },
      {
        id: "barren",
        label: "Неплодородные",
        signs: [
          { symbol: "♊", name: "Близнецы" },
          { symbol: "♒", name: "Водолей" },
          { symbol: "♌", name: "Лев" },
          { symbol: "♈", name: "Овен" },
        ],
        body: "От посева лучше отказаться — полоть и делать другие огородные работы.",
      },
    ],
  },
];

export async function seedSiteContent(
  prisma?: ContentMigrationPrisma,
) {
  const contentUrl = process.env.CONTENT_DATABASE_URL?.trim();
  const owned =
    prisma ??
    (contentUrl
      ? createContentPrisma(contentUrl)
      : (() => {
          throw new Error(
            "CONTENT_DATABASE_URL is required to seed site content into content_db",
          );
        })());
  const shouldDisconnect = !prisma;

  try {
    return await seedSiteContentInto(owned);
  } finally {
    if (shouldDisconnect) {
      await owned.$disconnect();
    }
  }
}

async function seedSiteContentInto(prisma: ContentMigrationPrisma) {
  const now = new Date();

  for (const guide of ALL_SEED_GUIDES) {
    const labelKeys = GUIDE_TAXONOMY_TAG_KEYS_BY_SLUG[guide.slug] ?? [];
    const labelRecords = await resolveTaxonomyTagIdsByKeys(labelKeys);

    const saved = await prisma.cropGuide.upsert({
      where: { slug: guide.slug },
      update: {
        cropKind: guide.cropKind,
        title: guide.title,
        excerpt: guide.excerpt,
        body: guide.body,
        bodySiteMd: guide.bodySiteMd ?? "",
        bodyTelegramMd: guide.bodyTelegramMd ?? "",
        sortOrder: guide.sortOrder,
        status: ContentStatus.PUBLISHED,
        publishedAt: now,
        seoTitle: `${guide.title} — SmartБотаник`,
        seoDescription: guide.excerpt,
      },
      create: {
        cropKind: guide.cropKind,
        slug: guide.slug,
        title: guide.title,
        excerpt: guide.excerpt,
        body: guide.body,
        bodySiteMd: guide.bodySiteMd ?? "",
        bodyTelegramMd: guide.bodyTelegramMd ?? "",
        sortOrder: guide.sortOrder,
        status: ContentStatus.PUBLISHED,
        publishedAt: now,
        seoTitle: `${guide.title} — SmartБотаник`,
        seoDescription: guide.excerpt,
      },
    });

    await prisma.cropGuideTaxonomyTag.deleteMany({
      where: { cropGuideId: saved.id },
    });
    if (labelRecords.length > 0) {
      await prisma.cropGuideTaxonomyTag.createMany({
        data: labelRecords.map(tag => ({
          cropGuideId: saved.id,
          taxonomyTagId: tag.id,
        })),
      });
    }
  }

  await prisma.sitePage.upsert({
    where: { key: "home" },
    update: {
      title: "SmartБотаник — главная",
      sections: HOME_SECTIONS,
      status: ContentStatus.PUBLISHED,
      publishedAt: now,
      seoTitle: "SmartБотаник — гайды по выращиванию",
      seoDescription:
        "Публичные гайды SmartБотаник: культуры, среда, советы. Приложение — скоро; Telegram — анонсы статей.",
    },
    create: {
      key: "home",
      title: "SmartБотаник — главная",
      sections: HOME_SECTIONS,
      status: ContentStatus.PUBLISHED,
      publishedAt: now,
      seoTitle: "SmartБотаник — гайды по выращиванию",
      seoDescription:
        "Публичные гайды SmartБотаник: культуры, среда, советы. Приложение — скоро; Telegram — анонсы статей.",
    },
  });

  await prisma.sitePage.upsert({
    where: { key: "calendar" },
    update: {
      title: "Календарь — SmartБотаник",
      sections: CALENDAR_SECTIONS,
      status: ContentStatus.PUBLISHED,
      publishedAt: now,
      seoTitle: "Календарь — SmartБотаник",
      seoDescription:
        "Лунный и сезонный календари SmartБотаник: фазы Луны и окна сезонов для работ в саду.",
    },
    create: {
      key: "calendar",
      title: "Календарь — SmartБотаник",
      sections: CALENDAR_SECTIONS,
      status: ContentStatus.PUBLISHED,
      publishedAt: now,
      seoTitle: "Календарь — SmartБотаник",
      seoDescription:
        "Лунный и сезонный календари SmartБотаник: фазы Луны и окна сезонов для работ в саду.",
    },
  });

  // ADR-0021 / ADR-0022: CalendarDay catalog from seed-data JSON (portable tag keys).
  const fs = await import("node:fs");
  const path = await import("node:path");
  const seedPath = path.resolve(
    __dirname,
    "../../../services/content/prisma/seed-data/calendar-days.json",
  );
  const seedFile = JSON.parse(fs.readFileSync(seedPath, "utf8")) as {
    days: Array<{
      date: string;
      title: string | null;
      bodyMd: string;
      moonPhase: string | null;
      moonZodiacSign: string | null;
      generalState: "GOOD" | "NEUTRAL" | "BAD";
      status?: string;
      cultureMarks?: Array<{
        taxonomyTagKey: string;
        activityKind: string;
        favorability: string;
        note?: string;
      }>;
    }>;
  };

  const markKeys = [
    ...new Set(
      seedFile.days.flatMap(d =>
        (d.cultureMarks ?? []).map(m => m.taxonomyTagKey),
      ),
    ),
  ];
  const cropTags =
    markKeys.length > 0 ? await resolveTaxonomyTagIdsByKeys(markKeys) : [];
  const tagIdByKey = new Map(cropTags.map(t => [t.key, t.id]));

  const utcDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };

  let calendarDays = 0;
  for (const sample of seedFile.days) {
    const date = utcDate(sample.date);
    const status =
      sample.status === "DRAFT"
        ? ContentStatus.DRAFT
        : sample.status === "ARCHIVED"
          ? ContentStatus.ARCHIVED
          : ContentStatus.PUBLISHED;
    const day = await prisma.calendarDay.upsert({
      where: { date },
      update: {
        title: sample.title,
        bodyMd: sample.bodyMd,
        moonPhase: sample.moonPhase,
        moonZodiacSign: sample.moonZodiacSign,
        generalState: sample.generalState,
        status,
        publishedAt: status === ContentStatus.PUBLISHED ? now : null,
      },
      create: {
        date,
        title: sample.title,
        bodyMd: sample.bodyMd,
        moonPhase: sample.moonPhase,
        moonZodiacSign: sample.moonZodiacSign,
        generalState: sample.generalState,
        status,
        publishedAt: status === ContentStatus.PUBLISHED ? now : null,
      },
    });
    await prisma.calendarDayCultureMark.deleteMany({
      where: { calendarDayId: day.id },
    });
    const marks = (sample.cultureMarks ?? [])
      .map(mark => {
        const taxonomyTagId = tagIdByKey.get(mark.taxonomyTagKey);
        if (!taxonomyTagId) return null;
        return {
          calendarDayId: day.id,
          taxonomyTagId,
          activityKind: mark.activityKind,
          favorability: mark.favorability,
          note: mark.note ?? null,
        };
      })
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
    if (marks.length > 0) {
      await prisma.calendarDayCultureMark.createMany({ data: marks });
    }
    calendarDays += 1;
  }

  return {
    guides: ALL_SEED_GUIDES.length,
    launchGuides: LAUNCH_GUIDES.length,
    sitePages: 2,
    calendarDays,
    status: ContentStatus.PUBLISHED,
  };
}
