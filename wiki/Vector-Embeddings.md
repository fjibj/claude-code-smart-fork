# 向量嵌入 (Vector Embeddings)

## 什么是向量嵌入？

向量嵌入（Vector Embedding）是将文本转换为数值向量的技术，使得语义相似的文本在向量空间中的距离更近。

### 直观理解

```
文本空间                              向量空间

"猫"  ----┐                          ┌-> [0.8, 0.2, -0.1, ...]
          │--- 语义相似             │
"小猫" --┤                          ├-> [0.75, 0.25, -0.15, ...]
          │                          │
"狗"  ----┘                          └-> [-0.3, -0.6, 0.4, ...]

在向量空间中，"猫"和"小猫"的向量距离很近
而"狗"的向量相对较远
```

## Smart Fork 中的嵌入流程

### 1. 文本预处理

```
原始文本："npm install 报 403 forbidden 错误"
              │
              ▼
┌─────────────────────────────────┐
│ 英文部分：npm, install, forbidden │
│ 中文部分：报，错误                 │
│ 过滤：403 (数字，可选)            │
└─────────────────────────────────┘
              │
              ▼
        tokens: ["npm", "install", "forbidden", "报", "错误", "npm install", "install forbidden", ...]
```

### 2. 本地嵌入器工作原理

Smart Fork 的本地嵌入器使用多哈希函数将文本映射到固定维度的向量空间。

```typescript
// 伪代码示例
function keywordEmbedding(text, dimension = 384) {
  const embedding = new Array(dimension).fill(0);

  // 1. 提取词项（中英文）
  const tokens = extractTokens(text);
  // ["npm", "install", "forbidden", "错误", ...]

  // 2. 对每个词项使用多个哈希函数
  for (const token of tokens) {
    const hash1 = rollingHash(token);  // 滚动哈希
    const hash2 = fnvHash(token);      // FNV 哈希

    // 3. 映射到向量位置
    const pos1 = abs(hash1) % dimension;
    const pos2 = abs(hash2) % dimension;

    // 4. 累加到向量
    embedding[pos1] += 1.0;
    embedding[pos2] += 0.5;
  }

  // 5. L2 归一化
  const norm = sqrt(sum(v^2 for v in embedding));
  return [v / norm for v in embedding];
}
```

### 3. 哈希函数示例

**滚动哈希（Rolling Hash）：**
```
hash("npm") = ((0 << 5) - 0) + 'n'.charCodeAt(0)
            = 110
            = 0x6E

hash("install") = 通过迭代计算得到唯一值
```

**FNV 哈希（Fowler-Noll-Vo）：**
```
hash("npm") = 0x811c9dc5  // FNV offset basis
for each char in "npm":
    hash ^= char.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
```

## 相似度计算

### 余弦相似度（Cosine Similarity）

Smart Fork 使用余弦相似度来衡量两个向量的相似程度。

```
                    A · B
cosine(A, B) = ---------------
                ||A|| × ||B||

其中:
• A · B = Σ(Ai × Bi)  // 点积
• ||A|| = √(ΣAi²)     // L2 范数
• ||B|| = √(ΣBi²)     // L2 范数
```

### 计算示例

```javascript
// 示例向量（简化为 5 维）
const queryVector = [0.5, 0.3, 0.1, 0.2, 0.1];    // 查询："npm install 错误"
const sessionAVector = [0.4, 0.35, 0.15, 0.1, 0.2]; // 会话 A: "npm install 403 错误"
const sessionBVector = [0.1, 0.1, 0.5, 0.4, 0.3];   // 会话 B: "用户认证系统"

// 计算点积
const dotA = 0.5*0.4 + 0.3*0.35 + 0.1*0.15 + 0.2*0.1 + 0.1*0.2 = 0.355
const dotB = 0.5*0.1 + 0.3*0.1 + 0.1*0.5 + 0.2*0.4 + 0.1*0.3 = 0.24

// 计算范数
const normQuery = Math.sqrt(0.5² + 0.3² + 0.1² + 0.2² + 0.1²) = 0.648
const normA = Math.sqrt(0.4² + 0.35² + 0.15² + 0.1² + 0.2²) = 0.593
const normB = Math.sqrt(0.1² + 0.1² + 0.5² + 0.4² + 0.3²) = 0.714

// 余弦相似度
const similarityA = 0.355 / (0.648 * 0.593) = 0.92  // 高度相关
const similarityB = 0.24 / (0.648 * 0.714) = 0.52   // 不太相关
```

## 嵌入提供者对比

Smart Fork 支持多种嵌入提供者，各有优缺点：

### Local（本地嵌入）

**优点：**
- ✅ 无需外部依赖
- ✅ 完全离线工作
- ✅ 零成本
- ✅ 隐私保护（数据不出本地）
- ✅ 支持中英文混合

**缺点：**
- ❌ 语义理解能力有限
- ❌ 相似度分数偏低
- ❌ 对复杂查询支持不佳

**适用场景：**
- 快速原型和测试
- 对隐私要求高的环境
- 资源受限的环境

**配置：**
```json
{
  "embedding": {
    "provider": "local",
    "dimension": 384
  }
}
```

### OpenAI

**优点：**
- ✅ 强大的语义理解
- ✅ 高相似度分数
- ✅ 支持多种语言
- ✅ 持续更新

**缺点：**
- ❌ 需要 API 密钥
- ❌ 按使用量收费
- ❌ 需要网络连接
- ❌ 数据发送到外部

**配置：**
```json
{
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimension": 1536
  }
}
```

**环境变量：**
```bash
export OPENAI_API_KEY="sk-..."
```

### Ollama（本地大模型）

**优点：**
- ✅ 本地运行，保护隐私
- ✅ 无需 API 费用
- ✅ 支持多种开源模型
- ✅ 可离线使用

**缺点：**
- ❌ 需要安装 Ollama
- ❌ 占用本地资源
- ❌ 模型质量取决于选择

**配置：**
```json
{
  "embedding": {
    "provider": "ollama",
    "model": "nomic-embed-text",
    "dimension": 768
  }
}
```

**环境变量：**
```bash
export OLLAMA_URL="http://localhost:11434"
```

## 维度选择

不同嵌入模型产生的向量维度不同：

| 提供者 | 模型 | 默认维度 |
|--------|------|----------|
| Local | keyword-based | 384 |
| OpenAI | text-embedding-3-small | 1536 |
| OpenAI | text-embedding-3-large | 3072 |
| Ollama | nomic-embed-text | 768 |
| Ollama | mxbai-embed-large | 1024 |

**维度影响：**
- 更高维度 = 更好的语义表示，但占用更多空间
- 更低维度 = 更快的计算速度，但可能损失精度
- Smart Fork 默认使用 384 维，平衡性能和准确性

## 中英文混合处理

Smart Fork 的本地嵌入器特别优化了中英文混合文本的处理：

```javascript
// 输入文本
const text = "npm install 失败，错误码 403";

// 1. 英文提取
const englishTokens = ["npm", "install", "失败", "错误码"];

// 2. 中文提取（单字 + 双字组合）
const chineseTokens = [
  // 单字
  "失", "败", "错", "误", "码",
  // 双字组合（bigram）
  "失败", "败错", "错误", "误码"
];

// 3. 合并所有词项
const allTokens = [...englishTokens, ...chineseTokens];

// 4. 过滤停用词
const filtered = allTokens.filter(t => !stopWords.has(t));
// stopWords 包含：的，了，is, are, the, a...

// 5. 生成嵌入
const embedding = keywordEmbedding(filtered);
```

## 性能优化技巧

### 1. 向量归一化

所有向量预先归一化，搜索时只需计算点积：

```javascript
// 预处理：归一化所有存储的向量
for (const session of sessions) {
  session.embedding = normalize(session.embedding);
}

// 搜索时：只需要点积（因为 query 也是归一化的）
const similarity = dot(queryVector, sessionVector);
// 等价于 cosine similarity，但更快
```

### 2. 批量嵌入

```javascript
// 批量处理多个文本，比逐个处理更快
const embeddings = await embeddingService.embedBatch([
  "文本 1",
  "文本 2",
  "文本 3"
]);
```

### 3. 缓存查询结果

```javascript
// 对常见查询缓存结果
const cache = new Map();

async function search(query) {
  if (cache.has(query)) return cache.get(query);

  const vector = await embeddingService.embed(query);
  const results = vectorStore.search(vector);

  cache.set(query, results);
  return results;
}
```

## 调试嵌入

### 可视化向量

```javascript
// 查看向量的非零元素数量
const embedding = await service.embed("测试文本");
const nonZeroCount = embedding.filter(v => v !== 0).length;
console.log(`非零元素：${nonZeroCount} / ${embedding.length}`);

// 查看向量的统计信息
const mean = embedding.reduce((a, b) => a + b, 0) / embedding.length;
const max = Math.max(...embedding);
const min = Math.min(...embedding);
console.log(`均值：${mean}, 最大值：${max}, 最小值：${min}`);
```

### 测试相似度

```javascript
// 测试两个文本的相似度
const embedding1 = await service.embed("npm install 错误");
const embedding2 = await service.embed("npm install 403 forbidden");

const similarity = cosineSimilarity(embedding1, embedding2);
console.log(`相似度：${(similarity * 100).toFixed(2)}%`);

// 期望输出：20% - 60%（本地嵌入）
```

## 常见问题

### Q: 为什么本地嵌入的相似度分数较低？

A: 本地关键词嵌入是基于词频的，不是真正的语义理解。建议使用 0.1-0.3 的阈值，而不是 0.6+。

### Q: 如何选择嵌入提供者？

A:
- 隐私优先：使用 `local` 或 `ollama`
- 最佳效果：使用 `openai`
- 离线使用：使用 `local` 或 `ollama`
- 预算有限：使用 `local`

### Q: 可以自定义嵌入维度吗？

A: 可以，在配置文件中设置：
```json
{
  "embedding": {
    "provider": "local",
    "dimension": 512  // 自定义维度
  }
}
```

### Q: 嵌入过程需要多长时间？

A:
- Local: < 1ms（384 维）
- OpenAI: ~100-500ms（网络延迟）
- Ollama: ~50-200ms（本地 GPU/CPU）
