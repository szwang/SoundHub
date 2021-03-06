var expect = require('chai').expect;
var request = require('request');
var http = require('http');
var assert = require('assert');

process.env.DATABASE_URL = 'sqlite://test.sqlite';
process.env.TESTING = true;

var app = require('../app/server.js');
var db = require('../app/db.js');

var api_request = request.defaults({
  'jar': true,
  'baseUrl': 'http://localhost:3030' 
});

describe('API Integration:', function() {
  
  before(function(done) {
    var server = http.createServer(app);
    app.set('port', 3030);
    server.listen(3030);
    server.on('listening', function() {
      console.log('listening!');
      done();
    })
    server.on('error', function(error) {
      console.error(error);
    })
  });

  describe('Basic song functions', function() {

    after(function(done) { //drop table after this section of tests run
      db.orm.sync({force: true})
        .then(function() {
          done();
        })
    })

    it('should create a song', function(done) {
      var uri = 'http://localhost:3030/addSong';
      request({
        uri: uri, 
        json: true,
        body: {
          title: 'bagfries',
          like: 2,
          genre: 'electronic',
          forks: 3,
          author: 1,
          path: '/1/2/',
          url: 'whatever.aws.com/blah'
        },
        method: 'post'
      }, function(err, res, body) {
        request({
          uri: 'http://localhost:3030/allSongs',
          method: 'get'
        }, function(err, res, body) { 
          var songs = JSON.parse(res.body);
          expect(songs).to.be.an('array');
          expect(songs[0].title).to.be.eql('bagfries');
          done();
        })
      })
    })

    it('should return correct number of songs', function(done) {
      var uri = 'http://localhost:3030/addSong';
      request({
        uri: uri,
        json: true,
        method: 'post',
        body: {
          title: 'I want u back',
          like: 1,
          genre: 'folk',
          forks: 0,
          author: 1,
          path: '/1/2/',
          url: 'whatever.aws.com/test'
        }
      }, function(err) {
        console.log(err);
        request({
          uri: 'http://localhost:3030/allSongSort',
          method: 'post',
          json: true,
          body: {
            order: 'like',
            page: 1
          }
        }, function(err, res) {
          expect(res.body.number).to.be.eql(2);
          done();
        })
      })
    })

    it('should return songs correctly sorted by like', function(done) {
      var uri = 'http://localhost:3030/allSongSort';
      request({
        uri: uri,
        json: true,
        method: 'post',
        body: {
          order: 'like',
          page: 1
        }
      }, function(err, res) {
        var songsByLike = res.body.songs;
        expect(songsByLike[0].title).to.be.eql('bagfries');
        expect(songsByLike[1].title).to.be.eql('I want u back');
        done();
      })
    })

    it('should return songs correctly sorted by newest', function(done) {
      var uri = 'http://localhost:3030/allSongSort';
      request({
        uri: uri,
        json: true,
        method: 'post',
        body: {
          order: 'createdAt',
          page: 1
        }
      }, function(err, res) {
        var songsByNewest = res.body.songs;
        expect(songsByNewest[0].title).to.be.eql('I want u back');
        expect(songsByNewest[1].title).to.be.eql('bagfries');
        done();
      })
    })
  })

  describe('User profile functions', function() {
    
    after(function(done) {
      db.orm.sync({force: true})
      .then(function() {
        done();
      })
    })

    it('should sign up a user', function(done) {
      var uri = 'http://localhost:3030/signup';
      request({
        uri: uri,
        json: true,
        method: 'post',
        body: {
          username: 'suzanne',
          password: 'bagfries'
        }
      }, function(err, res, body) {
        console.log(err);
        request({
          uri: 'http://localhost:3030/getuser',
          method: 'post',
          json: true,
          body: {
            id: 1
          }
        }, function(err, res, body) {
          var username = res.body.username;
          var imgUrl = res.body.profilePic;
          expect(username).to.be.eql('suzanne')
          expect(imgUrl).to.be.eql('https://s3-us-west-2.amazonaws.com/soundhub/defaultImg.jpg')
          done();
        })
      })
    })

    it('should update user profile image', function(done) {
      var uri = 'http://localhost:3030/updateImg';
      request({
        uri: uri,
        method: 'post',
        json: true,
        body: {
          userId: 1,
          imgUrl: 'http://newimgurl.com'
        }
      }, function(err) {
        console.log(err);
        request({
          uri: 'http://localhost:3030/getuser',
          method: 'post',
          json: true,
          body: {
            id: 1
          }
        }, function(err, res, body) {
          var url = res.body.profilePic;
          expect(url).to.be.eql('http://newimgurl.com');
          done();
        })
      })
    })

    it('should update username', function(done) {
      var uri = 'http://localhost:3030/updateUsername';
      request({
        uri: uri,
        method: 'post',
        json: true,
        body: {
          userId: 1,
          newname: 'matt'
        }
      }, function(err) {
        console.log(err);
        request({
          uri: 'http://localhost:3030/getuser',
          method: 'post',
          json: true,
          body: {
            id: 1
          }
        }, function(err, res) {
          expect(res.body.username).to.be.eql('matt');
          done();
        })
      })
    })

    it('should update password', function(done) {
      var uri = 'http://localhost:3030/updatePassword';
      request({
        uri: uri,
        method: 'post',
        json: true,
        body: {
          userId: 1,
          newPass: 'algore7'
        }
      }, function(err) {
        console.log(err);
        request({
          uri: 'http://localhost:3030/login',
          method: 'post',
          json: true,
          body: {
            username: 'matt',
            password: 'algore7' 
          }
        }, function(err, res) {
          console.log(err);
          console.log('response: ', res.success)
          done();
        })
      })
    })

  })

  describe('User song functions', function() {

    var targetId;

    before(function(done) {
      request({
        uri: 'http://localhost:3030/signup',
        method: 'post',
        json: true,
        body: {
          username: 'matt',
          password: 'richie'
        }
      }, function(err) {
        console.log(err);
        request({
          uri: 'http://localhost:3030/addSong',
          method: 'post',
          json: true,
          body: {
            title: 'bagfries',
            genre: 'electronic',
            author: 1,
            path: '/',
            url: 'whatever.aws.com/blah'
          }
        }, function(err) {
          console.log(err);
          request({
            uri: 'http://localhost:3030/signup',
            method: 'post',
            json: true,
            body: {
              username: 'mike',
              password: 'jim'
            }
          }, function(err) {
            console.log(err);
            request({
              uri: 'http://localhost:3030/addSong',
              method: 'post',
              json: true,
              body: {
                title: 'riff #2',
                genre: 'electronic',
                author: 2,
                path: '/',
                url: 'whatever.aws.com/blah'
              }
            }, function(err) {
              console.log(err);
              done();
            })
          })
        })
      })
    })

    after(function(done) {
      db.orm.sync({force: true})
      .then(function() {
        done();
      })
    })

    it('should correctly list uploaded songs', function(done) {
      request({
        uri: 'http://localhost:3030/addSong',
        method: 'post',
        json: true,
        body: {
          title: '123',
          author: 1,
          path: '/1/2/',
          url: 'whatever.aws.com/blah'
        }
      }, function(err) {
        var uri = 'http://localhost:3030/mySongs';
        request({
          uri: uri,
          method: 'post',
          json: true,
          body: {
            userId: 1
          }
        }, function(err, res) {
          var songs = res.body;
          expect(songs.length).to.be.eql(2);
          expect(songs[0].title).to.be.eql('bagfries');
          expect(songs[1].title).to.be.eql('123');
          done();
        })
      })
    })

    it('should correctly add and load favorites', function(done) {
      request({
        uri: 'http://localhost:3030/allSongs',
        method: 'get'
      }, function(err, res) {
        console.log(err);
        var songs = JSON.parse(res.body);
        targetId = songs[0].uuid;
        request({
          uri: 'http://localhost:3030/addFav',
          method: 'post',
          json: true,
          body: {
            userId: 1,
            songId: targetId
          }
        }, function(err, res) {
          console.log(err);
          request({
            uri: 'http://localhost:3030/myFavs',
            method: 'post',
            json: true,
            body: {
              userId: 1
            }
          }, function(err, res) {
            console.log(err);
            var songs = res.body;
            expect(songs.length).to.be.eql(1);
            expect(songs[0].uuid).to.be.eql(targetId);
            done();
          })
        })
      })
    })

    it('should correctly add and load votes', function(done) {
      request({
        uri: 'http://localhost:3030/addVote',
        method: 'post',
        json: true,
        body: {
          vote: -1,
          userId: 1,
          songId: targetId
        }
      }, function(err, res) {
        console.log(err);
        request({
          uri: 'http://localhost:3030/myVotes',
          method: 'post',
          json: true,
          body: {
            userId: 1
          }
        }, function(err, res) {
          console.log(err);
          var songs = res.body;
          expect(songs.length).to.be.eql(1);
          expect(songs[0].uuid).to.be.eql(targetId);
          expect(songs[0].upvote).to.be.eql(-1);
          done();
        })
      })
    })

    it('should correctly change votes', function(done) {
      request({
        uri: 'http://localhost:3030/addVote',
        method: 'post',
        json: true,
        body: {
          vote: 1,
          userId: 1,
          songId: targetId
        }
      }, function(err) {
        console.log(err);
        request({
          uri: 'http://localhost:3030/allSongs',
          method: 'get'
        }, function(err, res) {
          console.log(err)
          var response = JSON.parse(res.body)
          var song;
          for(var i=0; i<response.length; i++) {
            if(response[i].uuid === targetId) {
              song = response[i];
            }
          }
          expect(song.like).to.be.eql(1);
          request({
            uri: 'http://localhost:3030/myVotes',
            method: 'post',
            json: true,
            body: {
              userId: 1
            }
          }, function(err, res) {
            var songs = res.body;
            expect(songs[0].upvote).to.be.eql(1);
            done();
          })
        })
      })
    })

    it('should handle multiple user votes', function(done) {
      request({
        uri: 'http://localhost:3030/signup',
        method: 'post',
        json: true,
        body: {
          username: 'jim',
          password: 'mike'
        }
      }, function(err) {
        console.log(err);
        request({
          uri: 'http://localhost:3030/addVote',
          method: 'post',
          json: true,
          body: {
            vote: 1,
            userId: 2,
            songId: targetId
          }
        }, function(err) {
          console.log(err);
          request({
            uri: 'http://localhost:3030/allSongs',
            method: 'get'
          }, function(err, res) {
            console.log(err);
            var songs = JSON.parse(res.body);
            var votedSong;
            for(var i=0; i<songs.length; i++) {
              if(songs[i].uuid === targetId) {
                votedSong = songs[i];
              }
            }
            expect(votedSong.like).to.be.eql(2);
            done();
          })
        })
      })
    })

    it('should branch a song to the user branch collection', function(done) {
      request({
        uri: 'http://localhost:3030/addFork',
        method: 'post',
        json: true,
        body: {
          userId: 1,
          songId: targetId
        }
      }, function(err, res) {
        console.log(err);
        request({
          uri: 'http://localhost:3030/myForks',
          method: 'post',
          json: true,
          body: {
            userId: 1
          }
        }, function(err, res) {
          var forks = res.body;
          expect(forks[0].uuid).to.be.eql(targetId);
          done();
        })
      })
    })

    it('should create a song properly from branch', function(done) {
      done();
    })
  })
});



