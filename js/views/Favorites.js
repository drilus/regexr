/*
The MIT License (MIT)

Copyright (c) 2014 gskinner.com, inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
(function (scope) {
	"use strict";

	var Favorites = function (element, content) {
		this.init(element, content);
	};
	var p = Favorites.prototype;

	p.element = null;
	p.content = null;
	p.contentTemplate = null;
	p.docView = null;
	p.rating = null;
	p._visible = false;

	p.init = function(element, content) {
		this.element = element;
		this.content = content;

		this.loadClickProxy = $.bind(this, this.onLoadClick);

		this.contentTemplate = $.el(".community-content", this.element);
		this.description = $.el(".description", this.contentTemplate);
		this.author = $.el(".author", this.contentTemplate);
		this.expression = $.el(".expression", this.contentTemplate);

		this.previewWrap = $.el(".preview-wrap", this.contentTemplate);
		this.preview = $.el(".preview", this.contentTemplate);

		this.substitutionWrap = $.el(".substitution-wrap", this.contentTemplate);
		this.substitutionTitle = $.el(".substitution-title", this.contentTemplate);
		this.substitution = $.el(".substitution", this.contentTemplate);

		this.favoriteBtn = $.el(".favorite", this.contentTemplate);
		this.favoriteBtn.addEventListener("mouseover", $.bind(this, this.handleFavoriteOver));
		this.favoriteBtn.addEventListener("mouseout", $.bind(this, this.handleFavoriteOut));
		this.favoriteBtn.addEventListener("click", $.bind(this, this.handleFavoriteClick));

		this.spinner = $.el(".spinner").cloneNode();
		this.element.appendChild(this.spinner);

		this.list = new List(
				$.el(".community-list", this.element),
				$.el(".community-list .item.renderer", this.element),
				this
		);

		this.list.on("change", $.bind(this, this.onListChange));
		this.list.on("enter", $.bind(this, this.handleListEnter));
		this.initView();
	};
	p.super_init = p.init;

	p.initView = function() {
		$.remove($.el(".search", this.element));
		$.remove($.el(".tag-list-container", this.element));
		$.swapClass(this.element, "community", "favorites");
	};

	p.show = function() {
		this._visible = true;
		$.removeClass(this.spinner, "hidden");
		$.removeClass(this.element, "hidden");

		this.content.appendChild(this.contentTemplate);
		this.content.addEventListener("click", this.loadClickProxy);

		this.createRating();
		this.search();
		this.onListChange();
	};
	p.super_show = p.show;

	p.hide = function() {
		this._visible = false;
		$.addClass(this.element, "hidden");
		this.content.removeEventListener("click", this.loadClickProxy);
	};

	p.createRating = function() {
		this.rating = new Rating(0, 5, $.el(".rating", this.content), true);
		this.rating.addEventListener("change", $.bind(this, this.handleRatingChange));
	};

	p.showLoading = function(value) {
		if (value !== false) {
			$.addClass(this.contentTemplate, "hidden");
			$.removeClass(this.spinner, "hidden");
		} else {
			$.removeClass(this.contentTemplate, "hidden");
			$.addClass(this.spinner, "hidden");
		}
	};

	p.search = function() {
		var favIds = Settings.getAllFavorites();

		if (favIds.length) {
			this.showLoading();
			ServerModel.getPatternList(favIds).then($.bind(this, this.handleFavoritesLoad));
		} else {
			this.handleFavoritesLoad();
		}
	};

	p.handleFavoritesLoad = function(data) {
		if (data && data.results) {
			this.list.setData(data.results);
		} else {
			var promotionData = {
				content: "All your favorite patterns will be saved in the favourites section.",
				description: "Click the heart icon on any community pattern to add a new favorite.",
				id: "-1",
				name: "No favourites yet",
				pattern: "/(Favo)u?(rite)(s?)/ig",
				replace: "$1$2$3",
				weightedVote: "0",
				author:"gskinner.com"
			};
			this.list.setData([promotionData]);
		}

		this.list.setSelectedIndex(0);
		setTimeout($.bind(this, this.onListChange), 100);
	};

	p.onLoadClick = function(evt) {
		var el = evt.target;
		var type = '';

		if ($.hasClass(el, ".expr")) {
			type = "expr";
		} else if ($.hasClass(el, ".source")) {
			type = "source";
		} else if ($.hasClass(el, ".all")) {
			type = "all";
		} else if ($.hasClass(el, ".subst")) {
			type = "subst";
		}
		this.insertContent(type);
	};

	p.handleFavoriteOver = function() {
		var id = this.list.selectedItem.id;
		var isFav = Settings.getFavorite(id);

		if (isFav) {
			$.swapClass(this.favoriteBtn, "full", "empty")
		} else {
			$.swapClass(this.favoriteBtn, "empty", "full")
		}
	};

	p.handleFavoriteOut = function() {
		var id = this.list.selectedItem.id;
		var isFav = Settings.getFavorite(id);

		if (isFav) {
			$.swapClass(this.favoriteBtn, "empty", "full")
		} else {
			$.swapClass(this.favoriteBtn, "full", "empty")
		}
	};

	p.insertContent = function(type) {
		var data = this.list.selectedItem;

		var pattern = $.parsePattern(data.pattern);
		var expression = pattern.ex;
		var flags = pattern.flags;

		if (type == "expr") {
			this.docView.setPattern(expression);
			this.docView.setFlags(flags);
		} else if (type == "source") {
			this.docView.setText(data.content);
		} else if (type == "subst") {
			this.docView.setSubstitution(data.replace);
			this.docView.showSubstitution();
		} else if (type == "all") {
			if (ExpressionModel.id != data.id) {
				ExpressionModel.id = data.id;
				this.docView.populateAll(expression, flags, data.content, data.replace);
				ServerModel.trackVisit(data.id);
			}
		}
	};

	p.handleListEnter = function() {
		this.insertContent("all");

		var id =  this.list.selectedItem.id;
		ExpressionModel.id = id;
		if (id > -1) {
			BrowserHistory.go($.createID(id));
		} else {
			BrowserHistory.go();
		}
	};

	p.onListChange = function(evt) {
		var item = this.list.selectedItem;
		if (evt && item == evt.relatedItem) {
			this.handleListEnter();
			return;
		}

		var data = this.list.selectedItem;
		if (!data || isNaN(data.weightedVote)) {
			return;
		}

		this.description.innerHTML = TextUtils.htmlSafe(data.description);

		if (data.author) {
			this.author.innerHTML = TextUtils.htmlSafe(data.author);
		} else {
			this.author.innerHTML = "Anonymous";
		}
		this.expression.innerHTML = TextUtils.htmlSafe(data.pattern);

		if (data.content) {
			var pattern = $.parsePattern(data.pattern);
			var expression = pattern.ex;
			var flags = pattern.flags;
			var regex = new RegExp(expression, flags);

			// encode html, while inserting our own html for highlighting
			var preview = TextUtils.shorten(data.content, 125).replace(regex, "\v\fem\f\v$&\v\f/em\f\v");
			this.preview.innerHTML = TextUtils.htmlSafe(preview).replace(/\v\f(\/?)em\f\v/g, "<$1em>");
			$.removeClass(this.previewWrap, "hidden");
		} else {
			$.addClass(this.previewWrap, "hidden");
		}

		this.rating.setValue(Settings.getRating(data.id));

		this.updateFavorite(data.id);

		if (data.replace) {
			this.substitution.innerHTML = TextUtils.htmlSafe(data.replace);
			$.removeClass(this.substitutionWrap, "hidden");
		} else {
			$.addClass(this.substitutionWrap, "hidden");
		}

		if (this._visible) {
			$.removeClass(this.element, "hidden");
			this.showLoading(false);
		}
	};

	p.getLabel = function(o) {
		return TextUtils.htmlSafe(o.name);
	};

	p.getStaticRating = function(data) {
		if (!data || isNaN(data.weightedVote)) {
			return "";
		} else {
			return "<span class='inline-rating icon-star small'>"+Number(data.weightedVote).toFixed(1)+"</span>";
		}
	};

	p.handleRatingChange = function(evt) {
		var id = this.list.selectedItem.id;
		if (id == -1) {
			return;
		}

		var rating = this.rating.getValue();
		ServerModel.rate(id, rating);

		Settings.setRating(id, rating);
	};

	p.handleFavoriteClick = function() {
		var id = this.list.selectedItem.id;
		if (id == -1) { return; }
		Settings.setFavorite(id, !Settings.getFavorite(id));
		this.updateFavorite(id);
	};

	p.updateFavorite = function(id) {
		var isFav = Settings.getFavorite(id);
		if (isFav) {
			$.swapClass(this.favoriteBtn, "empty", "full")
		} else {
			$.swapClass(this.favoriteBtn, "full", "empty")
		}
	};

	scope.Favorites = Favorites;

}(window));
