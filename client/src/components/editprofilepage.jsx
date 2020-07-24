import React from 'react';
import Navbar from './navbar.jsx';
import EditProfile from './editprofile.jsx';

function getActive(){
  var url=window.location.href.split('/');
  return {name:url[url.length-2],url:window.location.href}
}

function editProfile(){
    return(
        <div>
            <Navbar links={{active:getActive(),other:[{name:'Home',url:'/'},{name:'Past Meets',url:'/pastmeets'},{name:'Join Meet',url:'/login'},{name:'Create Meet',url:'/login'}]}} brand='true' discuss='true' search='true' login='true' />
            <EditProfile link="/profile/edit"/>
        </div>
    );

}


export default editProfile;