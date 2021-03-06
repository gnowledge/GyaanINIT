const https = require('https');
const querystring = require('querystring');
const md5 = require('md5');
const zxcvbn = require('zxcvbn');
const secrets = require('./secrets.js');
const discourseFunctions = require('./discourseFunctions.js');
const registered_users = []; //{email,name,username,password,profilePic}
const calls = []; //{url,password,admin,category,categoryName,details,public,members,users,chats}
//chats  -> [{user,message,time}]
module.exports = {
  register_user: register_user,
  login: login,
  getUserInfo: getUserInfo,
  isLoggedIn: isLoggedIn,
  logout: logout,
  getAllUsers: getAllUsers,
  search: search,
  check_strength: check_strength,
  generateCall: generateCall,
  joinCall: joinCall,
  getCallUserList: getCallUserList,
  endCall: endCall,
  verifyInCall: verifyInCall,
  postMessageInCall: postMessageInCall,
  getCallChat: getCallChat,
  calls: calls,
  getDetailedUserInfo: getDetailedUserInfo,
  getPosts:getPosts,
  createTopic:createTopic,
  makePost:makePost,
  getGroups:getGroups,
  getGroup:getGroup,
  getCategories:getCategories,
  getBadges:getBadges,
  createPrivateTopic:createPrivateTopic,
  makePrivatePost:makePrivatePost
}

function User(name, email, password, username, identity) {
  this.name = name;
  this.email = email.toLowerCase();
  this.password = password;
  this.username = username;
  this.identity = identity;
  this.profilePic = 'https://ui-avatars.com/api/?rounded=true&name=' + this.name.split(' ').join('+'); //Default profile pic
}

async function register_user(body) {
  return await discourseFunctions.register(body.name, body.email, body.password, body.username, body.identity);
}

async function login(req, body) {
  const present = isLoggedIn(req);
  if (present.status) {
    return {
      status: true,
      message: 'Already Logged In',
      user: present.user
    };
  } else {
    return await discourseFunctions.login(req, body.username, body.password);
  }
}

async function getUserInfo(username) {
  const user = await discourseFunctions.getUserInfo(username, 0);
  if (user.user) {
    return {
      status: true,
      info: user.user,
      url:secrets.discourse_url
    }
  } else {
    return {
      status: false,
      info: null,
      url:secrets.discourse_url
    }
  }
}
async function getPosts(url1,url2,url3){
  return await discourseFunctions.fetchPosts(url1,url2,url3);
}

async function getDetailedUserInfo(username) {
  const user = await discourseFunctions.getUserInfo(username, 1);
  if (user.user && user.user.id) {
    return {
      status: true,
      info: user.user,
      url:secrets.discourse_url
    }
  } else {
    return {
      status: false,
      info: null,
      url:secrets.discourse_url
    }
  }
}
async function createTopic(req){
  return await discourseFunctions.createTopic(req);
}

async function createPrivateTopic(req){
  return await discourseFunctions.createPrivateTopic(req);
}

async function makePost(req){
  return await discourseFunctions.makePost(req);
}


async function makePrivatePost(req){
  return await discourseFunctions.makePrivatePost(req);
}

function isLoggedIn(req) {
  var found = false;
  var user = null;
  if (req.session && req.session.user) {
    found = true;
    user = req.session.user;
  }
  return {
    status: found,
    user: user
  };
}

function logout(req) {
  if (req.session) {
    let user = req.session.user;
    if (user) {
      req.session.user = null;
      req.session.cookie.maxAge = -1;
      req.session.destroy();
      req.session = null;
      return {
        status: true,
        message: "User logged out successfully"
      }
    } else {
      return {
        status: false,
        message: "User was not logged in"
      }
    }
  } else {
    return {
      status: false,
      message: "User was not logged in"
    }
  }
}

function getAllUsers() {
  //to be re coded
  const users = [];
  for (var i = 0; i < registered_users.length; i++) {
    users.push(getUserInfo(registered_users[i].username).info);
  }
  return users;
}

async function search(text) {
  return await discourseFunctions.search(text);
}

function check_strength(password) {
  var score = zxcvbn(password).score;
  if (score === 0) {
    score += 0.5;
  }
  return {
    strength: score / 4 * 100
  };
}

async function generateCall(url, password, admin_username,category,details,public,members,req) {
  if (isLoggedIn(req).status === true) {
    const found = calls.find(call => call.url === url);
    var temp = url;
    if (found) {
      var count = 0;
      for (var i = 0; i < calls.length; i++) {
        if (calls[i].url === temp) {
          count++;
          temp = url + count;
        }
      }
      url += (count);
    }
      const admin = await getUserInfo(admin_username);
      const test=await getCategories();
      var categoryName="";
      if(test.status){
        var categories=test.categories;
        var ind=-1;
        for(var i=0;i<categories.length;i++){
          if(categories[i].id===category){
            ind=i;
          }
        }
        if(ind!==-1){
          categoryName=categories[ind].name;
        }
      }
      var chk=await discourseFunctions.createTopicForCall(url, password, admin.info.name,category,categoryName,details,public,members,req);
      var topicId,topicSlug;
      //console.log(chk);
      if(chk.status){
        topicId=chk.topic_id;
        topicSlug=chk.topic_slug;
      }
      if (admin.status) {
        calls.push({
          url: url,
          password: md5(password),
          admin: admin.info,
          category:category,
          categoryName:categoryName,
          topic_id:topicId,
          topic_slug:topicSlug,
          details:details,
          public:public,
          members:members,
          users: [],
          chats: []
        });
        return {
          status: true,
          url: url
        }
      } else {
        return {
          status: false,
          url: null
        }
      }
  } else {
    return {
      status: false,
      url: null
    }
  }
}

async function joinCall(url, password, user_name, req) {
  if (isLoggedIn(req).status === true) {
    var index = -1;
    for (var i = 0; i < calls.length; i++) {
      if (calls[i].url === url) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      return {
        status: false,
        url: null,
        message: 'No such call found'
      }
    } else {
      if (calls[index].password === md5(password)) {
        var arr = calls[index].users.filter((user) => (user.username !== user_name));
        calls[index].users = arr;
        const user = await getUserInfo(user_name);
        if (user.status) {
          calls[index].users.push(user.info);
          return {
            status: true,
            url: url,
            message: 'Successfully Joined'
          }
        } else {
          return {
            status: true,
            url: url,
            message: 'Error while joining'
          }
        }
      } else {
        return {
          status: false,
          url: url,
          message: 'Incorrect Password'
        }
      }
    }
  } else {
    return {
      status: false,
      url: null,
      message: 'You are not logged in'
    }
  }
}

function getCallUserList(url) {
  var urlValid = false;
  var admin = '';
  var users = [];
  var category=-1; var categoryName=''; var details='';var public=false;var members=[];var topic_id=-1;var topic_slug='';
  for (var i = 0; i < calls.length; i++) {
    if (calls[i].url === url) {
      urlValid = true;
      admin = calls[i].admin;
      category=calls[i].category;
      categoryName=calls[i].categoryName;
      details=calls[i].details;
      public=calls[i].public;
      members=calls[i].members;
      topic_id=calls[i].topic_id;
      topic_slug=calls[i].topic_slug;
      for (var j = 0; j < calls[i].users.length; j++) {
        var temp = calls[i].users[j];
        users.push(temp);
      }
      break;
    }
  }
  if (users.length !== 0) {
    users.sort(function(a, b) {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    });
  }
  return {
    validUrl: urlValid,
    admin: admin,
    category:category,
    categoryName:categoryName,
    topic_id:topic_id,
    topic_slug:topic_slug,
    details:details,
    public:public,
    members:members,
    users: users
  };
}

function endCall(req, callUrl) {
  var callInfo = getCallUserList(callUrl);
  if (callInfo.validUrl === true) {
    var userList = callInfo.users;
    let currUser = req.session.user;
    if (!currUser) {
      return {
        status: false,
        currUser: "User not logged in"
      }
    }
    var found = false;
    for (var j = 0; j < userList.length; j++) {
      if (userList[j].username === currUser.username) {
        found = true;
        break;
      }
    }
    if (!found) {
      return {
        status: false,
        message: 'Current user not in this call'
      }
    }
    for (var i = 0; i < calls.length; i++) {
      if (calls[i].url === callUrl) {
        calls[i].users = calls[i].users.filter(user => user.username !== currUser.username);
        if (calls[i].users.length === 0) {
          calls[i].chats = [];
        }
        return {
          status: true,
          message: "User removed successfully from the call"
        }
      }
    }
    return {
      status: false,
      message: "No Such Call exists"
    }
  } else {
    return {
      status: false,
      message: "No Such Call exists"
    }
  }
}

function verifyInCall(req, callUrl) {
  var callInfo = getCallUserList(callUrl);
  if (callInfo.validUrl === true) {
    var userList = callInfo.users;
    let currUser = req.session.user;
    if (!currUser) {
      return {
        status: false,
        message: "User not logged in"
      }
    }
    var found = false;
    for (var j = 0; j < userList.length; j++) {
      if (userList[j].username === currUser.username) {
        found = true;
        break;
      }
    }
    if (found === false) {
      return {
        status: false,
        message: 'Current user not in this call'
      };
    } else {
      return {
        status: true,
        message: "User can access the call"
      };
    }
  } else {
    return {
      status: false,
      message: "No Such Call exists"
    };
  }
}

function postMessageInCall(req, callUrl, message) {
  var test = verifyInCall(req, callUrl);
  if (test.status === false) {
    return {
      status: false,
      message: test.message
    }
  } else {
    let user = req.session.user;
    if (!user) {
      return {
        status: false,
        message: "User not Logged in"
      }
    } else {
      var found = -1;
      for (var i = 0; i < calls.length; i++) {
        if (calls[i].url === callUrl) {
          found = i;
          break;
        }
      }
      if (found === -1) {
        return {
          status: false,
          message: "No Such Call exists"
        }
      } else {
        discourseFunctions.postToTopic(calls[found],user.username,message);
        calls[found].chats.push({
          user: user,
          message: message,
          time: new Date()
        });
        return {
          status: true,
          message: "Message Successfully Posted"
        }
      }
    }
  }
}

function getCallChat(req, url) {
  let test = verifyInCall(req, url);
  if (test.status === false) {
    return {
      status: false,
      chats: [],
      message: test.message
    }
  } else {
    var found = -1;
    for (var i = 0; i < calls.length; i++) {
      if (calls[i].url === url) {
        found = i;
        break;
      }
    }
    if (found === -1) {
      return {
        status: false,
        chats: [],
        message: "No Such Call exists"
      }
    } else {
      var chats = calls[found].chats;
      chats.sort(function(a, b) {
        return a.time.getTime() - b.time.getTime()
      });
      var chatList = []
      for (var i = 0; i < chats.length; i++) {
        chatList.push({
          user: chats[i].user,
          message: chats[i].message,
          time: chats[i].time
        });
      }
      return {
        status: true,
        message: "success",
        chats: chatList
      }
    }
  }
}

async function getGroups(){
  return await discourseFunctions.fetchGroups();
}

async function getGroup(topic,id){
  return await discourseFunctions.fetchGroup(topic,id);
}

async function getCategories(){
  return await discourseFunctions.fetchCategories();
}

async function getBadges(username){
  return await discourseFunctions.fetchBadges(username);
}
