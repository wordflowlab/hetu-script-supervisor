# 操作地图

由正式清单生成，执行前发现当前安装版Schema。

| 动作 | 用途 | 必填参数 | 效果 |
| --- | --- | --- | --- |
| list_projects | 查找专业工程 |  | read |
| get_project | 读取固定专业工程 | object_id | read |
| save_project | 保存完整专业工程 | expected_revision, expected_sha256, operation_key, content | managed_write |
| get_source | 分块读取固定来源 | object_id, source_index | read |
| get_basis | 读取固定专业依据 | object_id, basis_index | read |
| compare_versions | 比较固定专业修订 | object_id, from_revision, to_revision | read |
| export_project | 分块导出完整专业数据 | object_id, format | read |
| build_context | 准备有界创作上下文 | object_id, goal, max_chars | read |
| create_handoff | 准备本工程AI接续 | object_id, goal | read |
| get_operation | 回读原操作 | operation_key | read |
| put_evidence | 维护固定引文 | object_id, expected_revision, expected_sha256, operation_key, evidence | managed_write |
| put_scene | 维护场次 | object_id, expected_revision, expected_sha256, operation_key, scene | managed_write |
| remove_scene | 移除场次 | object_id, expected_revision, expected_sha256, operation_key, scene_id | managed_write |
| put_shot | 维护镜次 | object_id, expected_revision, expected_sha256, operation_key, shot | managed_write |
| remove_shot | 移除镜次 | object_id, expected_revision, expected_sha256, operation_key, shot_id | managed_write |
| put_take | 维护条次声明 | object_id, expected_revision, expected_sha256, operation_key, take | managed_write |
| put_observation | 维护连续性观察 | object_id, expected_revision, expected_sha256, operation_key, observation | managed_write |
| put_match | 维护连续性对照 | object_id, expected_revision, expected_sha256, operation_key, match | managed_write |
| remove_match | 移除连续性对照 | object_id, expected_revision, expected_sha256, operation_key, match_id | managed_write |
| put_selection | 维护剪辑选择 | object_id, expected_revision, expected_sha256, operation_key, selection | managed_write |
| remove_selection | 移除剪辑选择 | object_id, expected_revision, expected_sha256, operation_key, selection_id | managed_write |
| put_note | 维护固定意见 | object_id, expected_revision, expected_sha256, operation_key, note | managed_write |
| remove_note | 移除固定意见 | object_id, expected_revision, expected_sha256, operation_key, note_id | managed_write |
| target_digest | 读取目标固定摘要 | object_id, target_kind, target_id | read |
| check_script | 检查专业关系与依据 | object_id | read |
| match_basis | 核对连续性对照依据 | object_id, match | read |
| compare_match | 读取连续性对照 | object_id, match_id | read |
| selection_basis | 核对剪辑选择依据 | object_id, shot_id, take_id | read |
| take_view | 回读条次及时长 | object_id, take_id | read |
| export_reading | 导出专业阅读本 | object_id | read |
| export_review | 导出完整审核本 | object_id | read |
