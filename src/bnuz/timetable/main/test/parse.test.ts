// 青果课表列表的「上课时间、地点」一格可含多段，逗号既分隔段落也出现在周次里；未排课的段落不进课表。
import { describe, expect, it } from 'vitest';
import { parseBnuzSlots, parseTimetableList } from '../parse';

describe('parseBnuzSlots', () => {
  it('拆出周次、星期、节次与地点，去掉容量后缀', () => {
    expect(parseBnuzSlots('1-15周 二[9-10] 木铎楼C403(60)')).toEqual([
      {
        weeksText: '1-15周',
        weekNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        weekday: 2,
        startPeriod: 9,
        endPeriod: 10,
        classroom: '木铎楼C403',
      },
    ]);
  });

  it('多段时间各成一条，周次里的逗号不当作分段', () => {
    const slots = parseBnuzSlots('1-13,15周 一[1-2] 丽泽楼D105(93),15周 四[3-4] 丽泽楼D105(93)');
    expect(slots.map((slot) => [slot.weeksText, slot.weekday, slot.startPeriod])).toEqual([
      ['1-13,15周', 1, 1],
      ['15周', 4, 3],
    ]);
    expect(slots[0]!.weekNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15]);
  });

  it('单双周、单节、星期日', () => {
    const [odd] = parseBnuzSlots('1-15周(单) 五[3-4] 励教楼C203(83)');
    expect(odd!.weekNumbers).toEqual([1, 3, 5, 7, 9, 11, 13, 15]);
    const [single, sunday] = parseBnuzSlots('1-17周 二[6] 木铎楼C401(65),12周 日[9-12] 校内(800)');
    expect([single!.startPeriod, single!.endPeriod]).toEqual([6, 6]);
    expect([sunday!.weekday, sunday!.startPeriod, sunday!.endPeriod]).toEqual([7, 9, 12]);
  });

  it('未排课的段落只有周次，没有星期', () => {
    expect(parseBnuzSlots('6-12周(双) [ ]')).toEqual([
      {
        weeksText: '6-12周(双)',
        weekNumbers: [6, 8, 10, 12],
        weekday: null,
        startPeriod: 0,
        endPeriod: 0,
        classroom: null,
      },
    ]);
    expect(parseBnuzSlots('4-9周 []')[0]!.weekday).toBeNull();
  });

  it('中午第 99 节', () => {
    expect(parseBnuzSlots('1-8周 三[99] 校内(30)')[0]).toMatchObject({
      startPeriod: 99,
      endPeriod: 99,
    });
  });
});

const listHtml = `<table>
<tr><td>[课程号]课程名</td><td>总学时</td><td>学分</td><td>上课班号</td><td>任课教师</td><td>上课时间、地点</td><td>修读性质</td><td>辅修标识</td><td>免听标识</td><td>选课时间</td><td>提交人</td></tr>
<tr><td>[FAS21028]机器学习</td><td>64</td><td>2.0</td><td>01</td><td>李老师</td><td>1-15周 二[9-10] 木铎楼C403(60),1-15周 二[11-12] 木铎楼C403(60)</td><td>初修</td><td>主修</td><td>否</td><td>2026-01-23 14:42:24</td><td>王老师</td><td>&lt;学号&gt;</td><td>03</td><td>FAS21028</td><td>FAS21028-01</td></tr>
<tr><td>[GEN09007]形势与政策7</td><td>8</td><td>0.25</td><td>01</td><td>张老师</td><td>6-12周(双) [ ]</td><td>重修</td><td>主修</td><td>否</td><td>2026-07-09 15:31:30</td><td>张老师</td><td>&lt;学号&gt;</td><td>03</td><td>GEN09007</td><td>GEN09007-01</td></tr>
</table>`;

describe('parseTimetableList', () => {
  it('每个已排课的时间段成为一条课程，未排课的段落不进课表', () => {
    const lessons = parseTimetableList(listHtml, '2025-2026-2');
    expect(lessons).toHaveLength(2);
    expect(lessons[0]).toEqual({
      semester: '2025-2026-2',
      sourceId: 'FAS21028-01#0',
      courseCode: 'FAS21028',
      courseName: '机器学习',
      className: '01',
      teacher: '李老师',
      campus: null,
      classroom: '木铎楼C403',
      weekday: 2,
      startPeriod: 9,
      endPeriod: 10,
      periodsText: '第9-10节',
      weeksText: '1-15周',
      weekNumbers: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
      credits: 2,
      note: null,
    });
    expect(lessons[1]).toMatchObject({ sourceId: 'FAS21028-01#1', startPeriod: 11 });
  });

  it('只有表头时是没有选课的学期', () => {
    expect(
      parseTimetableList('<table><tr><td>[课程号]课程名</td></tr></table>', '2026-2027-3'),
    ).toEqual([]);
  });

  it('找不到课表表头时报错，不把它当成空课表', () => {
    expect(() => parseTimetableList('<html><body>系统繁忙</body></html>', '2026-2027-1')).toThrow(
      '课表返回了无法识别的页面',
    );
  });
});
