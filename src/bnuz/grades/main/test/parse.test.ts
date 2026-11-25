// 有效成绩每行都带学期，另有一张学校算好的学分与绩点汇总表；原始成绩按学期分组，只有组内首行写学期。
import { describe, expect, it } from 'vitest';
import { parseRawGrades, parseValidGrades, semesterFromText } from '../parse';

const validHtml = `<table>
<tr><td>学年学期</td><td>课程/环节</td><td>学分</td><td>实得学分</td><td>类别</td><td>课程性质</td><td>考核方式</td><td>修读性质</td><td>表现形式</td><td>综合成绩</td><td>课程绩点</td><td>辅修标记</td><td>备注</td></tr>
<tr><td>2023-2024学年秋季学期</td><td>[GEN01101]课程甲</td><td>3.0</td><td>3.0</td><td>通识课程/思想政治理论类</td><td>必修</td><td>考试</td><td>初修</td><td>百分制</td><td>84</td><td>3.4</td><td>主修</td><td></td></tr>
<tr><td>2023-2024学年秋季学期</td><td>[GEN01111]课程乙</td><td>2.0</td><td>2.0</td><td>通识课程/军事理论与军事技能</td><td>必修</td><td>考查</td><td>初修</td><td>五级制</td><td>优秀</td><td></td><td>辅修</td><td>备注文字</td></tr>
</table>
<table>
<tr><td>合计</td><td>修读总学分</td><td>获得总学分</td><td>纳入绩点计算的总学分</td><td>平均学分绩（GPA）</td></tr>
<tr><td>5.0</td><td>5.0</td><td>3.0</td><td>3.40</td></tr>
<tr><td colspan="5">学分绩点计算范围：……</td></tr>
</table>`;

const rawHtml = `<table>
<tr><td>学年学期</td><td>课程/环节</td><td>学分</td><td>类别</td><td>课程性质</td><td>考核方式</td><td>修读性质</td><td colspan="3">平时成绩</td><td>期末成绩</td><td>综合成绩</td><td>辅修标记</td><td>备注</td></tr>
<tr><td>过程</td><td>技能</td><td>期中</td></tr>
<tr><td>2023-2024学年秋季学期</td><td>[GEN01101]课程甲</td><td>3.0</td><td>通识课程/思想政治理论类</td><td>必修</td><td>考试</td><td>初修</td><td>90</td><td></td><td></td><td>80</td><td>84</td><td>主修</td><td></td></tr>
<tr><td></td><td>[GEN01111]课程乙</td><td>2.0</td><td>通识课程/军事理论与军事技能</td><td>必修</td><td>考查</td><td>初修</td><td></td><td></td><td></td><td></td><td>优秀</td><td>主修</td><td></td></tr>
<tr><td>2024-2025学年春季学期</td><td>[MAT01007]课程丙</td><td>6.0</td><td>专业课程/专业基础课</td><td>必修</td><td>考试</td><td>初修</td><td>88</td><td>70</td><td>75</td><td>66</td><td>72</td><td>主修</td><td></td></tr>
</table>`;

describe('semesterFromText', () => {
  it('学年学期文本换成内部学期编码', () => {
    expect(semesterFromText('2023-2024学年秋季学期')).toBe('2023-2024-1');
    expect(semesterFromText('2024-2025学年春季学期')).toBe('2024-2025-2');
    expect(semesterFromText('2024-2025学年夏季学期')).toBe('2024-2025-3');
    expect(semesterFromText('')).toBeNull();
  });
});

describe('parseValidGrades', () => {
  it('解析成绩记录与学校给出的学分绩点汇总', () => {
    const { records, summary } = parseValidGrades(validHtml);
    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({
      semester: '2023-2024-1',
      courseCode: 'GEN01101',
      courseName: '课程甲',
      credits: 3,
      earnedCredits: 3,
      category: '通识课程/思想政治理论类',
      nature: '必修',
      assessment: '考试',
      status: '初修',
      form: '百分制',
      score: '84',
      gradePoint: 3.4,
      minor: false,
      note: null,
      components: null,
    });
    expect(records[1]).toMatchObject({
      score: '优秀',
      gradePoint: null,
      minor: true,
      note: '备注文字',
    });
    expect(summary).toEqual({
      attemptedCredits: 5,
      earnedCredits: 5,
      gpaCredits: 3,
      gpa: 3.4,
    });
  });

  it('找不到成绩表头时报错', () => {
    expect(() => parseValidGrades('<html>系统繁忙</html>')).toThrow('成绩返回了无法识别的页面');
  });
});

describe('parseRawGrades', () => {
  it('按学期与课程号给出平时、期中、期末分项，空学期沿用上一行', () => {
    const components = parseRawGrades(rawHtml);
    expect(components.get('2023-2024-1|GEN01101')).toEqual({
      process: '90',
      skill: null,
      midterm: null,
      final: '80',
    });
    expect(components.get('2023-2024-1|GEN01111')).toEqual({
      process: null,
      skill: null,
      midterm: null,
      final: null,
    });
    expect(components.get('2024-2025-2|MAT01007')).toMatchObject({ skill: '70', midterm: '75' });
  });

  it('没有口令时教务系统返回「没有检索到记录」，不能当成没有成绩', () => {
    expect(() =>
      parseRawGrades('<div>北京师范大学珠海校区学生成绩明细[原始]</div><div>没有检索到记录!</div>'),
    ).toThrow('原始成绩为空，可能是登录或口令失效');
  });
});
