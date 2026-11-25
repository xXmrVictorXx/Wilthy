---
name: grades
description: 成绩：查询从教务系统同步的课程成绩与学分绩点
---

# 成绩

成绩读取本地缓存（由用户在成绩页面同步，agent 不联网）。

## 命令（Bash 内 wilthy）

- `wilthy query_grades`：按学期或课程查成绩，附教务系统给出的学分与 GPA 汇总

## 指引

- 成绩是敏感信息：只在用户问到成绩、绩点或学分时读取，不主动复述
- GPA 以 summary 为准，不要自己按其他口径重算；需要估算时说明是估算
- coverage 提示尚未同步时，提示用户到成绩页面点击同步
- 通用：`wilthy help` 查看全部命令与参数；不确定就先 help，不要猜测
