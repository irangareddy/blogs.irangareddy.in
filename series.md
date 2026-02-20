---
layout: page
title: Series
---

{% assign all_series_posts = site.posts | where_exp: "post", "post.series != nil" | sort: "series_order" %}
{% assign series_names = all_series_posts | map: "series" | uniq %}

{% if series_names.size == 0 %}
<p class="series-empty">No series yet. Check back soon.</p>
{% endif %}

{% for name in series_names %}
{% assign posts = all_series_posts | where: "series", name | sort: "series_order" %}
{% assign published = posts | where_exp: "p", "p.draft != true" %}
<div class="series-card">
  <h3>{{ name }}</h3>
  <p class="series-meta">{{ published.size }} of {{ posts.size }} parts published</p>
  <ol class="series-toc">
    {% for post in posts %}
    <li>
      <a href="{{ post.url }}">{{ post.title }}</a>
      <span class="series-toc-date">{{ post.date | date: "%b %Y" }}</span>
    </li>
    {% endfor %}
  </ol>
</div>
{% endfor %}
