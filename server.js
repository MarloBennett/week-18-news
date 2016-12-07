// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");

// Requiring our Comment and Article models
var Comment = require("./models/Comment.js");
var Article = require("./models/Article.js");

// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");

// Mongoose mpromise deprecated - use bluebird promises
var Promise = require("bluebird");

var PORT = process.env.PORT || 3000;

mongoose.Promise = Promise;

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

//use handlebars and specify default layout to main
app.engine("handlebars", exphbs({
	defaultLayout: "main"
}));
app.set("view engine", "handlebars");

// Make public a static dir
app.use(express.static("public"));

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/scrapedArticles");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

//Routes

// home page with button to go to articles list
// Scrape data from one site and place it into the mongodb db
app.get("/", function(req, res) {
  // First, we grab the body of the html with request
  request("https://www.bustle.com/lifestyle", function(error, response, html) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);
    // Now, we grab every h2 within an article tag, and do the following:
    $(".clip-default__title").each(function(i, element) {

      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
     // result.title = $(this).children().children("h3").text();
      result.title = $(this).text();
      result.link = $(this).closest("a").attr("href");


      // Using our Article model, create a new entry if article doesn't already exist
      // This effectively passes the result object to the entry (and the title and link)
    Article.count({title: result.title}, function (err, count) {

     	if (count == 0) {

		    var entry = new Article(result);

		    // Now, save that entry to the db
		    entry.save(function(err, doc) {
		        // Log any errors
		      if (err) {
		        console.log(err);
		      }
		        // Or log the doc
		      else {
		        console.log(doc);
		      }
		    });
	  	}
    });

    });
  });
  // Tell the browser that we finished scraping the text
  res.render("index");
});
/*
// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
  // Grab every doc in the Articles array
  	Article.find({})
	.then(function(data) {
		//send all objects to handlebars view
		var articleObj = {articles: data};
		console.log(JSON.stringify(articleObj));
		//render handlebars articles page
		res.render("articles", articleObj);
	});

	
});
*/
app.get("/articles", function(req, res) {
  // Grab every doc in the Articles array
  	Article.find({})
	.populate("comment")
    // Now, execute the query
    .exec(function(error, doc) {
      // Send any errors to the browser
      if (error) {
        res.send(error);
      }
    }).then(function(data) {
		//send all objects to handlebars view
		var articleObj = {articles: data};
		console.log(articleObj);
		//render handlebars index page
		res.render("articles", articleObj);
	});
});

app.post("/submit/:id", function(req, res) {
	
	var newComment = new Comment(req.body);

  // And save the new comment the db
  newComment.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update its comment
      Article.findOneAndUpdate({"_id": req.params.id}, { $push: { "comment": doc._id } }, { new: true }, function(err, newdoc) {
        // Send any errors to the browser
        if (err) {
          res.send(err);
        }
        // otherwise, send to route to populate comments
        else {
          res.redirect("/articles");
        }
      });
    }
  });
});

/*
// Route to see populate articles with comments
app.get("/populated", function(req, res) {
  // Prepare a query to find all articles..
  Article.find({})
    // ..and on top of that, populate the comments (replace the objectIds in the notes array with bona-fide notes)
    .populate("comment")
    // Now, execute the query
    .exec(function(error, doc) {
      // Send any errors to the browser
      if (error) {
        res.send(error);
      }
      // otherwise, send back to articles page
      else {
       // res.send(doc);
       res.redirect("/articles");
      }
    });
});
*/

//TODO
// get comments showing on articles page
// add input to delete comments

// Listen on port 3000
app.listen(PORT, function() {
  console.log("App running on port 3000!");
});