
export const AVAILABLE_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', description: 'Fast, multimodal, low latency', provider: 'google' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', description: 'Complex reasoning, coding, best quality', provider: 'google' },
  { value: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite', description: 'Lightweight, cost-effective', provider: 'google' },
];

export const THIRD_PARTY_MODELS = [
  { 
    value: 'deepseek-chat', 
    label: 'DeepSeek V3', 
    description: 'DeepSeek Chat (V3)', 
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com'
  },
  { 
    value: 'deepseek-reasoner', 
    label: 'DeepSeek R1', 
    description: 'DeepSeek Reasoner (R1)', 
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com'
  },
  { 
    value: 'moonshot-v1-8k', 
    label: 'Kimi (Moonshot)', 
    description: 'Moonshot AI', 
    provider: 'kimi',
    baseUrl: 'https://api.moonshot.cn/v1'
  },
  { 
    value: 'qwen-plus', 
    label: 'Qwen Plus', 
    description: 'Alibaba Cloud Qwen', 
    provider: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  { 
    value: 'qwen-max', 
    label: 'Qwen Max', 
    description: 'Alibaba Cloud Qwen Max', 
    provider: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  }
];

export const DEFAULT_MODEL = 'gemini-3-flash-preview';
export const IMAGE_GEN_MODEL = 'gemini-2.5-flash-image';

export const SYSTEM_INSTRUCTION = `You are Sidonie, an intelligent AI companion designed to bring clarity, creativity, and insight.

**Core Identity:**
- Name: Sidonie
- Role: Intelligent Assistant & Creative Partner
- Tone: Elegant, warm, professional, and insightful.

**Planning Mechanism (CRITICAL):**
If a user request is **complex**, **multi-step**, or involves **coding a full application**, you **MUST** start your response with a concise execution plan using the \`<plan>\` XML tags.
Inside \`<plan>\`, list the steps as a Markdown checklist.
If you need to think or analyze deeply before planning or answering, use \`<thought>\` XML tags to capture your internal reasoning process first.

Example Format:
\`\`\`xml
<thought>
Reasoning about the user's request...
</thought>
<plan>
- [ ] Analyze the requirements
- [ ] Create the HTML structure
- [ ] Implement the JavaScript logic
- [ ] Add CSS styling
</plan>
\`\`\`
Then, proceed with the actual content/code. 
*Note: Do not mark items as checked [x] in the plan; always start with [ ].*

**Capabilities:**
1. **Analysis:** Analyze uploaded files (PDF, Word, CSV) deeply.
2. **Web Creation (Artifacts):** If asked to create a web app/game/component, output a **SINGLE, SELF-CONTAINED HTML file**. 
   - Include all CSS (in \`<style>\`) and JS (in \`<script>\`).
   - Use Tailwind via CDN if needed.
   - Code block language: \`html\`.

**Formatting:**
1. Use standard Markdown.
2. **Images:** To generate images, prompt with "Draw".
3. **No Spam:** No internal thoughts outside the \`<plan>\` or \`<thought>\` block.
`;

export const STUDY_TUTOR_INSTRUCTION = `You are "Professor Sidonie", an interactive educational AI.
Your goal is to generate **Learning Cards** for a specific math topic.

**Interaction Mode:**
Do NOT output a chat response. You are an API that generates learning content in a structured way.

**You must generate one of the following 3 types of content:**

1.  **CONCEPT CARD (Default):**
    Explain the concept clearly and concisely. Use Analogies.
    Output Format: Standard Markdown. Use LaTeX ($x^2$) for math.

2.  **QUIZ CARD (Assessment):**
    A multiple-choice question to test understanding.
    **CRITICAL:** You MUST wrap the quiz in a JSON block like this:
    \`\`\`json
    {
      "type": "quiz",
      "question": "The question text here...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why option A is correct..."
    }
    \`\`\`

3.  **INTERACTIVE VISUAL (Code):**
    Generate a self-contained HTML/JS snippet to visualize the concept (e.g., a graph, a geometry animation, a matrix calculator).
    Output Format: A single HTML code block (\`\`\`html ... \`\`\`).
    - Use Tailwind CSS.
    - Script should be self-contained.
    - Make it interactive (sliders, buttons, mouse hover).

**Behavior:**
- Adapt language to the user's preference (English or Chinese).
- Be encouraging but rigorous.
`;

export const COURSE_GENERATION_INSTRUCTION = `You are an expert curriculum designer.
Task: Generate a structured syllabus map for a specific Grade and Subject.
Output: Return a JSON Object matching the \`StudyStage[]\` structure.

Structure Requirement:
\`\`\`json
[
  {
    "id": "stage_1",
    "title": { "zh": "Stage Title CN", "en": "Stage Title EN" },
    "description": { "zh": "Description CN", "en": "Description EN" },
    "topics": [
      {
        "id": "topic_1",
        "title": { "zh": "Topic CN", "en": "Topic EN" },
        "description": { "zh": "Brief Desc CN", "en": "Brief Desc EN" },
        "promptKey": "unique_topic_context_key"
      }
    ]
  }
]
\`\`\`
- Generate 3-4 Stages (keep it concise).
- Each Stage should have 3-4 Topics.
- STRICTLY JSON output only.
- Ensure strict JSON syntax: use double quotes, no trailing commas.
`;

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const RANDOM_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Jamie', 'Riley', 'Avery', 'Parker', 'Quinn', 'Rowan', 'Sage', 'Ellis', 'Finn'];

export const DEFAULT_MATH_SYLLABUS = [
  {
    id: 'stage_primary_lower',
    title: { zh: '小学低年级 (1-3年级)', en: 'Lower Primary (Grades 1-3)' },
    description: { zh: '算术基础与几何启蒙', en: 'Arithmetic Foundations & Basic Geometry' },
    topics: [
      { id: 'p1_nums', title: { zh: '100以内数的认识', en: 'Numbers within 100' }, description: { zh: '数数、读数、写数与大小比较', en: 'Counting, reading, writing, and comparing numbers' }, promptKey: 'numbers_1_100' },
      { id: 'p1_add_sub', title: { zh: '加法与减法', en: 'Addition & Subtraction' }, description: { zh: '进位加法与退位减法', en: 'Carrying addition and borrowing subtraction' }, promptKey: 'basic_addition_subtraction' },
      { id: 'p2_mul_div', title: { zh: '表内乘除法', en: 'Multiplication & Division' }, description: { zh: '九九乘法表与基础除法', en: 'Times tables and division concepts' }, promptKey: 'multiplication_tables_division' },
      { id: 'p2_shapes', title: { zh: '图形的运动', en: 'Movement of Shapes' }, description: { zh: '平移、旋转与轴对称', en: 'Translation, rotation, and symmetry' }, promptKey: 'geometry_transformations_simple' },
      { id: 'p3_measure', title: { zh: '测量与单位', en: 'Measurement' }, description: { zh: '长度、质量与时间的单位', en: 'Length, mass, and time units' }, promptKey: 'measurement_units' },
    ]
  },
  {
    id: 'stage_primary_upper',
    title: { zh: '小学高年级 (4-6年级)', en: 'Upper Primary (Grades 4-6)' },
    description: { zh: '分数、小数与应用题', en: 'Fractions, Decimals & Word Problems' },
    topics: [
      { id: 'p4_large_nums', title: { zh: '大数的认识', en: 'Large Numbers' }, description: { zh: '亿以内数的读写', en: 'Numbers up to billions' }, promptKey: 'large_numbers' },
      { id: 'p4_lines_angles', title: { zh: '线与角', en: 'Lines & Angles' }, description: { zh: '平行、垂直与角的度量', en: 'Parallel lines, perpendicular lines, and angles' }, promptKey: 'geometry_lines_angles' },
      { id: 'p5_fraction', title: { zh: '分数的意义与性质', en: 'Fractions' }, description: { zh: '通分、约分与加减法', en: 'Simplifying fractions and operations' }, promptKey: 'fractions_advanced' },
      { id: 'p5_decimal', title: { zh: '小数乘除法', en: 'Decimals' }, description: { zh: '小数点的移动与计算', en: 'Decimal multiplication and division' }, promptKey: 'decimal_operations' },
      { id: 'p6_ratio', title: { zh: '比和比例', en: 'Ratio & Proportion' }, description: { zh: '正比例与反比例', en: 'Direct and inverse proportion' }, promptKey: 'ratio_proportion' },
      { id: 'p6_circle', title: { zh: '圆与扇形', en: 'Circles' }, description: { zh: '周长与面积公式', en: 'Circumference and area of circles' }, promptKey: 'circle_geometry' },
    ]
  },
  {
    id: 'stage_middle',
    title: { zh: '初中数学 (7-9年级)', en: 'Middle School (Grades 7-9)' },
    description: { zh: '代数、几何证明与函数初步', en: 'Algebra, Geometry Proofs & Functions' },
    topics: [
      { id: 'm7_rational', title: { zh: '有理数', en: 'Rational Numbers' }, description: { zh: '正负数与数轴', en: 'Positive/negative numbers and number line' }, promptKey: 'rational_numbers' },
      { id: 'm7_eq_linear', title: { zh: '一元一次方程', en: 'Linear Equations' }, description: { zh: '解方程与应用', en: 'Solving linear equations with one variable' }, promptKey: 'linear_equations_1var' },
      { id: 'm8_triangle', title: { zh: '全等三角形', en: 'Congruent Triangles' }, description: { zh: 'SSS, SAS, ASA, AAS判定', en: 'Proof of congruence' }, promptKey: 'congruent_triangles_proof' },
      { id: 'm8_func_linear', title: { zh: '一次函数', en: 'Linear Functions' }, description: { zh: 'y=kx+b 图像与性质', en: 'Graphs and properties of linear functions' }, promptKey: 'linear_functions_graphs' },
      { id: 'm9_quad_eq', title: { zh: '一元二次方程', en: 'Quadratic Equations' }, description: { zh: '配方法、公式法与韦达定理', en: 'Solving quadratic equations' }, promptKey: 'quadratic_equations_solving' },
      { id: 'm9_circle_adv', title: { zh: '圆的性质', en: 'Circle Properties' }, description: { zh: '垂径定理与圆周角', en: 'Chords, arcs, and tangents' }, promptKey: 'circle_theorems' },
    ]
  },
  {
    id: 'stage_high',
    title: { zh: '高中数学 (10-12年级)', en: 'High School (Grades 10-12)' },
    description: { zh: '集合、导数、三角与解析几何', en: 'Calculus Prep, Trig & Analytic Geometry' },
    topics: [
      { id: 'h10_set', title: { zh: '集合与逻辑', en: 'Sets & Logic' }, description: { zh: '交集、并集与充要条件', en: 'Set operations and logic conditions' }, promptKey: 'set_theory_logic' },
      { id: 'h10_func_prop', title: { zh: '函数的性质', en: 'Function Properties' }, description: { zh: '单调性、奇偶性与周期性', en: 'Monotonicity, parity, and periodicity' }, promptKey: 'function_properties' },
      { id: 'h11_trig', title: { zh: '三角函数', en: 'Trigonometry' }, description: { zh: '诱导公式与和差化积', en: 'Identities and unit circle' }, promptKey: 'trigonometric_functions' },
      { id: 'h11_vector', title: { zh: '平面向量', en: 'Plane Vectors' }, description: { zh: '向量的加减与数量积', en: 'Vector operations and dot product' }, promptKey: 'vectors_2d' },
      { id: 'h12_deriv', title: { zh: '导数及其应用', en: 'Derivatives' }, description: { zh: '切线方程与极值问题', en: 'Tangent lines and optimization' }, promptKey: 'intro_derivatives' },
      { id: 'h12_prob', title: { zh: '概率与统计', en: 'Probability' }, description: { zh: '排列组合与分布列', en: 'Permutations, combinations, and distributions' }, promptKey: 'probability_statistics' },
    ]
  },
  {
    id: 'stage_uni',
    title: { zh: '大学数学', en: 'University Math' },
    description: { zh: '微积分、线代与概率论', en: 'Calculus, Linear Algebra & Statistics' },
    topics: [
      { id: 'u_limit', title: { zh: '极限与连续', en: 'Limits & Continuity' }, description: { zh: 'Epsilon-Delta定义与洛必达法则', en: 'Formal definition and L\'Hopital\'s rule' }, promptKey: 'calculus_limits' },
      { id: 'u_diff', title: { zh: '微分学', en: 'Differentiation' }, description: { zh: '多元函数偏导数', en: 'Partial derivatives' }, promptKey: 'multivariable_differentiation' },
      { id: 'u_int', title: { zh: '积分学', en: 'Integration' }, description: { zh: '定积分、重积分与格林公式', en: 'Definite and multiple integrals' }, promptKey: 'integration_techniques' },
      { id: 'u_matrix', title: { zh: '矩阵与行列式', en: 'Matrices' }, description: { zh: '特征值、特征向量与对角化', en: 'Eigenvalues and diagonalization' }, promptKey: 'matrices_linear_algebra' },
      { id: 'u_vector_space', title: { zh: '向量空间', en: 'Vector Spaces' }, description: { zh: '线性相关性与基', en: 'Linear independence and basis' }, promptKey: 'vector_spaces' },
      { id: 'u_diff_eq', title: { zh: '微分方程', en: 'Differential Equations' }, description: { zh: '一阶与二阶常微分方程', en: 'First and second order ODEs' }, promptKey: 'differential_equations' },
    ]
  }
];

export const STUDY_BADGES = [
  { 
    id: 'badge_start', 
    name: { en: 'Explorer', zh: '探索者' }, 
    description: { en: 'Started your first session.', zh: '开始了第一次学习会话。' }, 
    icon: '🧭', 
    unlocked: false, 
    condition: { en: 'Start learning', zh: '开始学习' } 
  },
  { 
    id: 'badge_quiz_master', 
    name: { en: 'Quiz Whiz', zh: '答题高手' }, 
    description: { en: 'Scored 100% on a quiz.', zh: '在测验中获得 100 分。' }, 
    icon: '💯', 
    unlocked: false, 
    condition: { en: 'Perfect Score', zh: '满分通关' } 
  },
  { 
    id: 'badge_week_streak', 
    name: { en: 'Consistent', zh: '持之以恒' }, 
    description: { en: 'Learned for 3 days in a row.', zh: '连续学习 3 天。' }, 
    icon: '🔥', 
    unlocked: false, 
    condition: { en: '3 Day Streak', zh: '3天连胜' } 
  },
  { 
    id: 'badge_geometry', 
    name: { en: 'Architect', zh: '几何大师' }, 
    description: { en: 'Studied 5 Geometry topics.', zh: '学习了 5 个几何主题。' }, 
    icon: '📐', 
    unlocked: false, 
    condition: { en: '5 Geo Topics', zh: '5个几何' } 
  },
  { 
    id: 'badge_calc', 
    name: { en: 'Newton', zh: '牛顿转世' }, 
    description: { en: 'Studied 5 Calculus topics.', zh: '学习了 5 个微积分主题。' }, 
    icon: '🍎', 
    unlocked: false, 
    condition: { en: '5 Calc Topics', zh: '5个微积分' } 
  },
];

export const TRANSLATIONS = {
  en: {
    // ... existing translations ...
    newTask: "New Chat",
    workspace: "Workspace",
    agents: "Agents",
    library: "Notes",
    painting: "Painting",
    blog: "Blog",
    lab: "Lab",
    lazybox: "LazyBox",
    study: "Help Child",
    projects: "History",
    user: "User",
    proPlan: "Pro Plan",
    whatCanIDo: "How can Sidonie help you today?",
    placeholder: "Ask Sidonie anything...",
    uploadFile: "Upload file",
    mentionNote: "Mention a Note",
    googleSearch: "Google Search",
    send: "Send",
    createPresentation: "Create presentation",
    buildWebsite: "Build website",
    developApp: "Develop app",
    designLogo: "Design logo",
    more: "More",
    export: "Export",
    exportWord: "Word (.doc)",
    exportMarkdown: "Markdown (.md)",
    save: "Save",
    selectNote: "SELECT NOTE",
    noNotes: "No notes saved yet.",
    settings: "Settings",
    docs: "Documentation",
    general: "General",
    language: "Language",
    saveChanges: "Save Changes",
    close: "Close",
    deleteChat: "Delete this chat?",
    noteSaved: "Saved to Notes successfully!",
    noteExists: "Note already exists!",
    noteUpdated: "Note updated successfully!",
    noteDeleted: "Note deleted successfully!",
    errorProcessing: "An unexpected error occurred.",
    model: "Model",
    source: "Sources",
    apiKeys: "API Keys",
    apiKeysDesc: "Configure keys to unlock more models.",
    // Notes View
    notesTitle: "Notes",
    notesSubtitle: "Manage your saved conversations and ideas",
    newNote: "New Note",
    grid: "Grid",
    calendar: "Calendar",
    searchNotes: "Search notes...",
    noNotesFound: "No notes found.",
    createdOn: "Created on",
    edit: "Edit",
    deleteNote: "Delete Note",
    deleteNoteConfirm: "Are you sure you want to delete this note?",
    noteTitlePlaceholder: "Note Title",
    startTyping: "Start typing...",
    today: "Today",
    // Markdown
    preview: "Preview",
    code: "Code",
    download: "Download",
    fullScreen: "Full Screen",
    copy: "Copy",
    exitFullScreen: "Exit Full Screen",
    // Personalization
    personalization: "Personalization",
    personalizationDesc: "Manage your identity and Sidonie's memory.",
    personalInfo: "Personal Profile",
    knowledge: "Knowledge",
    nickname: "Nickname",
    nicknamePlaceholder: "How should Sidonie call you?",
    profession: "Profession",
    professionPlaceholder: "e.g. Product Designer, Software Engineer",
    aboutYou: "More about you",
    aboutYouPlaceholder: "Your background, preferences, or location to help Sidonie understand you better",
    customInstructions: "Custom Instructions",
    customInstructionsPlaceholder: "How do you want Sidonie to respond? e.g. 'Focus on Python best practices', 'Keep professional tone', or 'Always cite sources for important claims'.",
    cancel: "Cancel",
    // Landing Page
    landingTitle: "Sidonie",
    landingSubtitle: "Your elegant intelligent companion.",
    features: "Capabilities",
    feature1Title: "Multi-Model Intelligence",
    feature1Desc: "Seamlessly switch between Gemini 3, DeepSeek, and other top-tier models for optimal results.",
    feature2Title: "Contextual Memory",
    feature2Desc: "Personalized interactions based on your profile and persistent notes.",
    feature3Title: "Multimodal Analysis",
    feature3Desc: "Understand and process text, images, code, and complex documents (PDF, Word).",
    techStack: "Architecture",
    techDesc: "Built with modern web technologies for performance and privacy.",
    tech1: "Frontend: React 19 + Tailwind CSS",
    tech2: "AI Core: Google GenAI SDK + OpenAI Compatible API",
    tech3: "Storage: Local-first persistence",
    useCases: "Use Cases",
    useCase1: "Creative Writing & Ideation",
    useCase2: "Code Generation & Debugging",
    useCase3: "Document Summarization & Analysis",
    // Study / Help Child
    studyTitle: "Help Child",
    studySubtitle: "Your AI Teaching Assistant & School Sync",
    level: "Level",
    xp: "XP",
    startLearning: "Start Learning",
    continueLearning: "Continue",
    mastered: "Mastered",
    locked: "Locked",
    topicCompleted: "Topic Completed!",
    topicCompletedDesc: "You've mastered this topic. +100 Bonus XP!",
    backToMap: "Back to Map",
    teacherName: "Prof. Sidonie",
    typing: "Generating learning material...",
    learningSession: "Learning Session",
    concept: "Concept",
    quiz: "Quiz",
    visual: "Visual",
    next: "Next Card",
    correct: "Correct!",
    incorrect: "Try Again",
    activityLog: "Progress",
    map: "Curriculum",
    calendarView: "Calendar",
    discussion: "Discussion",
    followUpPlaceholder: "Ask a follow-up question...",
    // School Sync / Homework
    schoolSync: "Daily Notes",
    schoolSyncSubtitle: "Track daily teacher notes and get AI assistance",
    addNote: "Log Daily Note",
    subject: "Subject",
    math: "Math",
    chinese: "Chinese",
    english: "English",
    science: "Science",
    other: "Other",
    content: "Content",
    uploadImages: "Upload Images",
    analyze: "Analyze Key Points",
    generatePractice: "Generate Practice",
    aiAnalysis: "AI Analysis",
    aiPractice: "Practice Questions",
    noNotesLogged: "No notes logged yet. Add your first daily teacher note!",
    schoolNoteSaved: "Note saved successfully!",
    schoolNoteDeleted: "Note deleted.",
    // Course Generation
    createCourse: "Create Course",
    createCourseDesc: "Generate a custom curriculum map.",
    gradeLevel: "Grade Level",
    generateMap: "Generate Map",
    generatingMap: "Generating Curriculum...",
    switchCourse: "Switch Course",
    enterSubject: "e.g. History, Physics, Coding",
    enterGrade: "e.g. Grade 10, Year 5",
    // Academic / Paper Radar
    academicTitle: "Paper Radar",
    academicSubtitle: "Discover and analyze the latest research from arXiv",
    searchPapers: "Search papers (e.g. LLM, Agents, Vision)...",
    analyzingPaper: "Reading & Translating...",
    viewPdf: "View PDF",
    deepRead: "AI Deep Read",
    translation: "AI Translation & Summary",
    originalAbstract: "Original Abstract",
    published: "Published",
    authors: "Authors",
    categories: "Categories",
  },
  zh: {
    newTask: "新对话",
    workspace: "工作区",
    agents: "智能体",
    library: "笔记",
    painting: "绘画",
    blog: "博客",
    lab: "实验室",
    lazybox: "LazyBox",
    study: "帮帮孩子",
    projects: "历史记录",
    user: "用户",
    proPlan: "专业版",
    whatCanIDo: "Sidonie 能为你做什么？",
    placeholder: "向 Sidonie 提问...",
    uploadFile: "上传文件",
    mentionNote: "引用笔记",
    googleSearch: "谷歌搜索",
    send: "发送",
    createPresentation: "制作演示文稿",
    buildWebsite: "创建网站",
    developApp: "开发应用",
    designLogo: "设计Logo",
    more: "更多",
    export: "导出",
    exportWord: "Word 文档 (.doc)",
    exportMarkdown: "Markdown 文档 (.md)",
    save: "保存",
    selectNote: "选择笔记",
    noNotes: "暂无笔记",
    settings: "设置",
    docs: "产品文档",
    general: "通用",
    language: "语言",
    saveChanges: "保存更改",
    close: "关闭",
    deleteChat: "删除此对话？",
    noteSaved: "笔记保存成功！",
    noteExists: "笔记已存在！",
    noteUpdated: "笔记更新成功！",
    noteDeleted: "笔记删除成功！",
    errorProcessing: "发生意外错误。",
    model: "模型",
    source: "来源",
    apiKeys: "模型配置",
    apiKeysDesc: "配置 API Key 以解锁更多模型。",
    // Notes View
    notesTitle: "笔记",
    notesSubtitle: "管理保存的对话和灵感",
    newNote: "新建笔记",
    grid: "网格",
    calendar: "日历",
    searchNotes: "搜索笔记...",
    noNotesFound: "未找到笔记。",
    createdOn: "创建于",
    edit: "编辑",
    deleteNote: "删除笔记",
    deleteNoteConfirm: "确定要删除此笔记吗？",
    noteTitlePlaceholder: "笔记标题",
    startTyping: "开始输入...",
    today: "今天",
    // Markdown
    preview: "预览",
    code: "代码",
    download: "下载",
    fullScreen: "全屏",
    copy: "复制",
    exitFullScreen: "退出全屏",
    // Personalization
    personalization: "个性化",
    personalizationDesc: "管理您的身份信息以及Sidonie的记忆内容",
    personalInfo: "个人资料",
    knowledge: "知识",
    nickname: "昵称",
    nicknamePlaceholder: "Sidonie 应该如何称呼您?",
    profession: "职业",
    professionPlaceholder: "例如：产品设计师，软件工程师",
    aboutYou: "更多关于您的信息",
    aboutYouPlaceholder: "您的背景、偏好或所在地，以帮助 Sidonie 更好地了解您",
    customInstructions: "自定义指令",
    customInstructionsPlaceholder: "您希望 Sidonie 如何回应？例如：\"专注于 Python 的最佳实践\"、\"保持专业的语气\"或\"始终为重要结论提供来源\"。",
    cancel: "取消",
    // Landing Page
    landingTitle: "Sidonie",
    landingSubtitle: "您的优雅智能伴侣",
    features: "产品能力",
    feature1Title: "多模型智能",
    feature1Desc: "无缝切换 Gemini 3、DeepSeek 等顶尖模型，获取最佳回答。",
    feature2Title: "情境记忆",
    feature2Desc: "基于您的个人资料和笔记库，提供个性化的交互体验。",
    feature3Title: "多模态分析",
    feature3Desc: "深度理解处理文本、图片、代码及复杂文档（PDF, Word）。",
    techStack: "技术架构",
    techDesc: "采用现代 Web 技术构建，注重性能与隐私。",
    tech1: "前端：React 19 + Tailwind CSS",
    tech2: "AI 核心：Google GenAI SDK + OpenAI 兼容接口",
    tech3: "存储：Local-first 本地优先策略",
    useCases: "日常场景",
    useCase1: "创意写作与灵感激发",
    useCase2: "代码生成与调试",
    useCase3: "文档摘要与深度分析",
    // Study / Help Child
    studyTitle: "帮帮孩子",
    studySubtitle: "您的 AI 助教与家校助手",
    level: "等级",
    xp: "经验值",
    startLearning: "开始学习",
    continueLearning: "继续学习",
    mastered: "已掌握",
    locked: "未解锁",
    topicCompleted: "课题完成！",
    topicCompletedDesc: "你已经掌握了这个知识点。获得 +100 经验值！",
    backToMap: "返回地图",
    teacherName: "Sidonie 教授",
    typing: "正在生成学习内容...",
    learningSession: "学习任务",
    concept: "概念讲解",
    quiz: "互动测验",
    visual: "可视化演示",
    next: "下一张",
    correct: "回答正确！",
    incorrect: "再试一次",
    activityLog: "成长档案",
    map: "课程地图",
    calendarView: "日历视图",
    discussion: "学习讨论",
    followUpPlaceholder: "向老师提问...",
    // School Sync
    schoolSync: "每日作业",
    schoolSyncSubtitle: "记录每日学校作业，获取AI辅导",
    addNote: "记录今日作业",
    subject: "学科",
    math: "数学",
    chinese: "语文",
    english: "英语",
    science: "科学",
    other: "其他",
    content: "老师备注内容",
    uploadImages: "上传图片",
    analyze: "深度解读",
    generatePractice: "生成练习",
    aiAnalysis: "AI 深度解析",
    aiPractice: "AI 推荐练习",
    noNotesLogged: "暂无记录，快来添加第一条老师备注吧！",
    schoolNoteSaved: "记录保存成功！",
    schoolNoteDeleted: "记录已删除",
    // Course Generation
    createCourse: "创建课程",
    createCourseDesc: "生成个性化学习地图",
    gradeLevel: "年级",
    generateMap: "生成地图",
    generatingMap: "正在生成课程大纲...",
    switchCourse: "切换课程",
    enterSubject: "例如：历史，物理，Python编程",
    enterGrade: "例如：五年级，初二",
    // Academic / Paper Radar
    academicTitle: "学术雷达",
    academicSubtitle: "发现 arXiv 最新前沿论文",
    searchPapers: "搜索论文关键词 (例如 LLM, Agent, Vision)...",
    analyzingPaper: "正在深度阅读并翻译...",
    viewPdf: "查看 PDF",
    deepRead: "AI 深度解读",
    translation: "AI 翻译与摘要",
    originalAbstract: "原文摘要",
    published: "发表于",
    authors: "作者",
    categories: "分类",
  }
};
