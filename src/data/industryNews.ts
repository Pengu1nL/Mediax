export interface IndustryNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  tag: string;
}

const DEFAULT_NEWS: IndustryNewsItem[] = [
  {
    id: 'default-1',
    title: '品牌团队更重视内容资产的持续复用',
    summary: '越来越多团队把热点追踪、素材沉淀和发布计划放进同一工作流，减少一次性内容带来的重复投入。',
    source: '行业增长简报',
    publishedAt: '2026-04-22',
    tag: '品牌趋势',
  },
  {
    id: 'default-2',
    title: '垂直行业内容开始转向小规模高频更新',
    summary: '品牌侧不再只依赖大型活动节点，而是通过短周期选题持续维护用户心智和渠道活跃度。',
    source: '内容运营观察',
    publishedAt: '2026-04-20',
    tag: '内容节奏',
  },
  {
    id: 'default-3',
    title: '本地化议题成为品牌传播的重要入口',
    summary: '地域、社区和场景化信息正在帮助品牌把宏观行业变化转译成更贴近用户的问题与故事。',
    source: '市场洞察日报',
    publishedAt: '2026-04-18',
    tag: '本地洞察',
  },
];

const INDUSTRY_NEWS: Record<string, IndustryNewsItem[]> = {
  default: DEFAULT_NEWS,
  '教育 / 民办高中': [
    {
      id: 'education-1',
      title: '上海民办高中招生咨询进入集中预热期',
      summary: '家长更关注课程体系、升学路径和校园生活的真实呈现，学校内容传播需要同步回答选择焦虑。',
      source: '教育观察周报',
      publishedAt: '2026-04-23',
      tag: '招生趋势',
    },
    {
      id: 'education-2',
      title: '融合课程成为高中品牌差异化表达重点',
      summary: '越来越多学校把跨学科项目、国际视野和学生成长案例放到前台，替代单一硬件展示。',
      source: '民办教育参考',
      publishedAt: '2026-04-21',
      tag: '课程表达',
    },
    {
      id: 'education-3',
      title: '校园开放日内容从活动通知转向体验叙事',
      summary: '短视频和图文平台上，沉浸式动线、学生访谈和课堂片段更容易帮助家长建立具体感知。',
      source: '校园传播笔记',
      publishedAt: '2026-04-19',
      tag: '开放日',
    },
  ],
  科技与软件: [
    {
      id: 'software-1',
      title: 'AI 工作流工具进入团队级采用阶段',
      summary: '企业用户开始从单点提效转向流程整合，产品传播需要展示清晰的团队协作场景。',
      source: '软件商业评论',
      publishedAt: '2026-04-23',
      tag: 'AI 应用',
    },
    {
      id: 'software-2',
      title: '垂直 SaaS 更强调行业模板和落地速度',
      summary: '买方对通用能力的敏感度下降，行业预设、数据迁移和上线周期成为更高频的决策因素。',
      source: 'ToB 产品周刊',
      publishedAt: '2026-04-20',
      tag: 'SaaS 增长',
    },
    {
      id: 'software-3',
      title: '开发者内容从功能发布转向实践案例',
      summary: '技术受众更愿意阅读真实集成过程、性能对比和错误处理经验，浅层发布稿转化下降。',
      source: '开发者生态观察',
      publishedAt: '2026-04-18',
      tag: '开发者关系',
    },
  ],
  媒体与出版: [
    {
      id: 'media-1',
      title: '会员内容开始围绕专题化产品打包',
      summary: '出版机构把栏目、活动和资料库组合成可持续订阅权益，提升用户留存和付费感知。',
      source: '出版经营参考',
      publishedAt: '2026-04-22',
      tag: '会员运营',
    },
    {
      id: 'media-2',
      title: '短内容渠道成为新书预热的早期测试场',
      summary: '编辑团队通过短视频、播客片段和图文摘录测试主题吸引力，再反向优化宣发重点。',
      source: '媒体内容周报',
      publishedAt: '2026-04-20',
      tag: '渠道测试',
    },
    {
      id: 'media-3',
      title: '作者个人品牌和机构品牌协同增强',
      summary: '读者越来越通过作者观点建立信任，出版品牌需要提供统一视觉和节奏支持。',
      source: '文化传播观察',
      publishedAt: '2026-04-17',
      tag: '作者品牌',
    },
  ],
  设计与创意服务: [
    {
      id: 'creative-1',
      title: '创意服务客户更关注品牌系统的长期维护',
      summary: '项目交付从单次视觉提案延伸到素材规范、模板体系和跨渠道一致性管理。',
      source: '设计商业观察',
      publishedAt: '2026-04-23',
      tag: '品牌系统',
    },
    {
      id: 'creative-2',
      title: '案例内容成为创意机构获客核心资产',
      summary: '客户更希望看到问题拆解、策略选择和执行复盘，而不仅是最终视觉成品展示。',
      source: '创意服务简报',
      publishedAt: '2026-04-21',
      tag: '案例营销',
    },
    {
      id: 'creative-3',
      title: 'AI 视觉工具推动设计流程重新分工',
      summary: '团队开始把探索、生成和精修拆成更明确的协作节点，项目管理和版权说明更受关注。',
      source: '设计工具前线',
      publishedAt: '2026-04-18',
      tag: 'AI 设计',
    },
  ],
};

export function getIndustryNews(industry: string, limit = 3): IndustryNewsItem[] {
  const key = industry.trim();
  const news = INDUSTRY_NEWS[key] ?? DEFAULT_NEWS;

  return news.slice(0, Math.max(0, limit));
}
