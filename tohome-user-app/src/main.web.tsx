// Web 入口 - 浏览器端渲染 React Native App
import { AppRegistry } from 'react-native';
import App from '../App';

AppRegistry.registerComponent('tohome', () => App);
AppRegistry.runApplication('tohome', {
  rootTag: document.getElementById('root'),
});
