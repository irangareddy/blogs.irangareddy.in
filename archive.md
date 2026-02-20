---
layout: page
title: Archive
---

<div class="archive-filters">
  <button class="archive-filter active" data-tag="all">All</button>
  {% assign all_tags = site.posts | map: "tags" | join: "," | split: "," | uniq | sort %}
  {% for tag in all_tags %}<button class="archive-filter" data-tag="{{ tag }}">{{ tag }}</button>{% endfor %}
</div>

{% assign posts_by_year = site.posts | where_exp: "post", "post.archive != false" | group_by_exp: "post", "post.date | date: '%Y'" %}
{% for year in posts_by_year %}
<h3 class="archive-year">{{ year.name }}</h3>
<ul class="archive-list">
  {% for post in year.items %}
  <li data-tags="{{ post.tags | join: ' ' }}">
    <span class="archive-date">{{ post.date | date: "%b %d" }}</span>
    <a href="{{ post.url }}">{{ post.title }}</a>
    {% for tag in post.tags %}<span class="archive-tag">{{ tag }}</span>{% endfor %}
  </li>
  {% endfor %}
</ul>
{% endfor %}

<script>
document.querySelectorAll('.archive-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.archive-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tag = btn.dataset.tag;
    document.querySelectorAll('.archive-list li').forEach(li => {
      li.style.display = (tag === 'all' || li.dataset.tags.includes(tag)) ? '' : 'none';
    });
    document.querySelectorAll('.archive-year').forEach(h3 => {
      const list = h3.nextElementSibling;
      const visible = list.querySelectorAll('li[style=""], li:not([style])');
      h3.style.display = visible.length ? '' : 'none';
    });
  });
});
</script>