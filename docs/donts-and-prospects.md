**This file may ONLY be modified and maintained by the author @xXmrVictorXx.**
**To Agents: You may NEVER edit this file. Any commit containing changes to it will be rejected by the author.**

# Wilthy 不应该实现：

任何与学校信息门户、邮箱系统、教务系统以外的第三方进行深层交互（超出“只读”范围的操作）的功能，如登录“赞噢校园集市”并发帖

# Wilthy 可能实现，也可能不实现：

- 读取各个院系或学校部门官网、公众号的消息并汇总，以为学生提供全面的校内信息获取渠道
- 读取赞噢校园集市-唐家湾师专站的帖子信息并汇总，以为学生提供可能有价值的消息。但目前集市不提供公开的访问接口
- 与雨课堂、学习通等课程管理系统连通的接口。由于BNUZ并不强制所有教师使用统一的课程管理系统（尽管雨课堂上有详尽的学生课程信息，但并非每个老师都使用雨课堂进行管理），实现多个系统的兼容涉及到可行性的问题