# 有界配对材料评估

四份新回答满足全部16项预登记标准，未增加关键错误。独立匿名评分为旧15/16、新16/16；唯一差异是旧Q3未明确复述“缺编译器”，但已经明确未编译或运行。保留严格扣分，不把它描述为伪造执行或内存/ABI错误。四组核心工程决策两臂均正确，未观察到关键决策提升；这些结果不能证明整体质量或统计显著提升。

| 固定任务 | 旧材料 | 新材料 | 原始回答 |
| --- | --- | --- | --- |
| Q1 | 4/4 | 4/4 | [旧](model-evaluation/old/Q1.answer.md) / [新](model-evaluation/new/Q1.answer.md) |
| Q2 | 4/4 | 4/4 | [旧](model-evaluation/old/Q2.answer.md) / [新](model-evaluation/new/Q2.answer.md) |
| Q3 | 3/4 | 4/4 | [旧](model-evaluation/old/Q3.answer.md) / [新](model-evaluation/new/Q3.answer.md) |
| Q4 | 4/4 | 4/4 | [旧](model-evaluation/old/Q4.answer.md) / [新](model-evaluation/new/Q4.answer.md) |

同一选材算法读取中文SKILL及references Markdown/JSON，按SHA256去重，单包上限192KiB、最多4次文件读取、禁联网/写入/外部读取、回答≤1200汉字。旧材料与回答在实现前冻结；新材料单独冻结，不截断选材。新包字节数99852/56269/50847/56496；新回答汉字842/879/888/840。全部只有一次内容回答，没有择优或重新采样。读输出截断在同一4次预算内补齐，读取次数及截断恢复摘要见两臂runtime-audit.json；它们由回答者依据既有调用记录自报，未导出逐条原始工具轨迹，因此不能额外独立审计预算或越界控制。

旧/新回答均为fresh context，使用同一父会话继承模型与推理选择器，未覆盖设置。服务端精确模型和推理标识未暴露，不能独立证明隐藏后端参数完全一致；这是有效性限制，不将其归因为材料效果。

一个独立评分者只读取匿名8份答案及固定题目/标准；未提供old/new映射或作者历史。共32项判定与引文见[原始盲评分](model-evaluation/blind-scores.json)，评分后[揭盲](model-evaluation/reveal.json)。实施者逐项对照原回答和任务事实，保留原评分，分工与唯一严重度说明见[事实复核](model-evaluation/author-check.json)。评分者不承担最终代码/内容评审。

每臂manifest保留选材路径、字节数、hash、去重与配置；完整冻结材料、原始回答、读取摘要及本轮原生测试日志保留在忽略的任务目录；模型逐条工具调用未单独导出。相关指导不等于实际运行。仅覆盖15个入口的四类问题，其余入口模型行为未验证，参见[覆盖矩阵](coverage.md)。没有外部生产数据或密钥。
