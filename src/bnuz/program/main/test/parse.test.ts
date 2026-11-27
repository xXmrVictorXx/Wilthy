// 培养方案两张表都走通用 DataTable：分组列只在组内首行填写；行数必须和页面声明的总条数一致。
import { describe, expect, it } from 'vitest';
import { summarizeModules } from '../../contract';
import { parseDataTable, planFromRows, progressFromRows } from '../parse';

const table = (id: string, total: string, rows: string[][]) =>
  `<table id="keywords">${rows
    .map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('')}</table><script>try{parent.showTotalRecord('${id}','${total}');}catch(e){}</script>`;

const planRows = [
  [
    '序号',
    '学年学期',
    '课程',
    '学分',
    '课程类别',
    '考核方式',
    '总学时',
    '理论学时',
    '实验学时',
    '实践学时',
    '其它学时',
    '周学时',
    '备注',
    '教学大纲',
    '',
  ],
  [
    '1',
    '2023-2024学年秋季学期',
    '[EDU30001]课程甲',
    '0.50',
    '实践环节/专业课程',
    '考查',
    '8',
    '8',
    '0',
    '0',
    '0',
    '2.0',
    '详细',
    '',
    'EDU30001',
  ],
  [
    '2',
    '',
    '[GEN01102]课程乙',
    '3.00',
    '思想政治理论类/通识课程',
    '考试',
    '64',
    '32',
    '0',
    '0',
    '32',
    '4.0',
    '详细',
    '',
    'GEN01102',
  ],
];

const progressRows = [
  ['课程模块', '课程代码', '课程名称', '学分', '总学时', '开设学期', '成绩', '选课'],
  ['通识课程/思想政治理论类/必修', 'GEN01102', '课程乙', '3.00', '64', '一', '88', ''],
  ['', 'GEN09001', '课程丙', '0.25', '8', '一', '不及格', ''],
  ['专业课程/专业核心课/必修', 'SAI13001', '课程丁', '2.00', '32', '五', '', ''],
  ['', 'SAI13001', '课程丁', '2.00', '32', '七', '', ''],
];

describe('parseDataTable', () => {
  it('返回表头之后的行', () => {
    expect(parseDataTable(table('2508', '2', planRows), '2508')).toHaveLength(2);
  });

  it('解析出的行数与页面声明的总条数不一致时报错', () => {
    expect(() => parseDataTable(table('2508', '3', planRows), '2508')).toThrow(
      '培养方案表格条数不一致',
    );
  });
});

describe('planFromRows', () => {
  it('学期沿用上一行，课程号与课程名分开', () => {
    const plan = planFromRows(parseDataTable(table('2508', '2', planRows), '2508'));
    expect(plan[1]).toEqual({
      semester: '2023-2024-1',
      courseCode: 'GEN01102',
      courseName: '课程乙',
      credits: 3,
      category: '思想政治理论类/通识课程',
      assessment: '考试',
      hours: 64,
    });
  });

  it('同一课程在多个学期各列一行时只保留最早的学期', () => {
    const repeated = [...planRows, ['3', '2023-2024学年春季学期', '[EDU30001]课程甲', '0.50']];
    const plan = planFromRows(parseDataTable(table('2508', '3', repeated), '2508'));
    expect(plan.map((course) => [course.courseCode, course.semester])).toEqual([
      ['EDU30001', '2023-2024-1'],
      ['GEN01102', '2023-2024-1'],
    ]);
  });
});

describe('progressFromRows', () => {
  it('课程模块沿用上一行，未出成绩为 null，重复列出的课程只算一次', () => {
    const progress = progressFromRows(
      parseDataTable(table('5327008', '4', progressRows), '5327008'),
    );
    expect(progress.map((course) => [course.module, course.courseCode, course.score])).toEqual([
      ['通识课程/思想政治理论类/必修', 'GEN01102', '88'],
      ['通识课程/思想政治理论类/必修', 'GEN09001', '不及格'],
      ['专业课程/专业核心课/必修', 'SAI13001', null],
    ]);
  });

  it('按模块汇总已获学分，不及格与未修不计入', () => {
    const progress = progressFromRows(
      parseDataTable(table('5327008', '4', progressRows), '5327008'),
    );
    expect(summarizeModules(progress)).toEqual([
      { module: '通识课程/思想政治理论类/必修', earnedCredits: 3, passed: 1, total: 2 },
      { module: '专业课程/专业核心课/必修', earnedCredits: 0, passed: 0, total: 1 },
    ]);
  });
});
