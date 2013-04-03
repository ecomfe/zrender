zrender
=======
一个轻量级的Canvas类库，MVC封装，数据驱动，提供类Dom事件模型，让canvas绘图大不同！

Architecture

MVC核心封装实现图形仓库、视图渲染和交互控制：


Stroage(M) : shape数据CURD管理

Painter(V) : canvase元素生命周期管理，视图渲染，绘画，更新控制

Handler(C) : 事件交互处理，实现完整dom事件模拟封装

shape : 图形实体，分而治之的图形策略，可定义扩展

tool : 绘画扩展相关实用方法，工具及脚手架


homepage : https://ecomfe.github.com/zrender
