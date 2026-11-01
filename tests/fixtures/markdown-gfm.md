---
title: Markdown regression fixture
date: 2000-01-01
categories:
  - notes
tags:
  - tests
---

# Markdown regression fixture

A paragraph with **bold**, *emphasis*, ~~deleted text~~ and `inline <code>`.
A soft line break stays in this paragraph.

A separate paragraph with a hard line break.  
This line follows a break.

## Recommendation pipeline

| 海量物品 | 召回 | 粗排 | 精排 | 重排 | 最终推荐 |
| :--- | ---: | :---: | --- | --- | --- |
| `candidate_identifier_012345678901234567890123456789` | 10000 | 1000 | 100 | 20 | 10 |

## Tasks

- [x] Completed task
- [ ] Pending task
  - [X] Nested completed task
  - Ordinary nested item

## Experiments

Before the separator.

---

- A/B测试
  - 分层实验

After the list.

3. Third item
   - Nested unordered item
   - Another nested item
4. Fourth item

   A second paragraph inside the fourth item.

### Third-level heading

> A quotation with **emphasis**.
>
> A second quoted paragraph.
> - A quoted list item

#### Fourth-level heading

```c++
# This is code, not a heading
const char* text = "<script>not executable</script>";
// | not | a table |
// [x] not a task
```

##### Fifth-level heading

~~~text
https://example.com/this_is_a_deliberately_long_unbroken_code_line_012345678901234567890123456789012345678901234567890123456789
~~~

###### Sixth-level heading

![Existing fixture image](Hot100_files/image_1.png "Image title")

[Relative PDF](Python.pdf "PDF title") and [external link](https://example.com/ "Link title").

## Duplicate heading

## Duplicate heading

Final paragraph.
