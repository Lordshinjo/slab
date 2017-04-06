// @flow
import { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import vis from 'vis';
import moment from 'moment';
import type { State } from '../state';
import { fetchHistory, switchBoardView } from '../actions';
import Controller from './TimelineController';

type Props = {
  boardTitle: string,
  history: any,
  error: ?string,
  isLoading: boolean,
  fetchHistory: () => void,
  switchBoardView: (isLiveMode: boolean, timestamp?: number) => void,
  isLiveMode: boolean
};

class Timeline extends Component {
  props: Props;

  timeline: any;
  static DATE_FORMAT = 'YYYY-MM-DD HH:mm';

  constructor(props: Props) {
    super(props);
    this.timeline = null;
  }

  componentWillMount() {
    this.props.fetchHistory();
  }

  render() {
    const { history, isLoading, error, boardTitle } = this.props;
    return (
      <div className="timeline">
        <Controller boardTitle={boardTitle}/>
        {isLoading && <div>Loading...</div>}
        {error && <div>{error}</div>}
        {history && <div id="container" />}
      </div>
    );
  }

  shouldComponentUpdate(nextProps) {
    if (this.props.isLiveMode === true && nextProps.isLiveMode === false) {
      // go back to a past timepoint
      return false;
    }
    return true;
  }

  componentDidUpdate(prevProps) {
    const node = findDOMNode(this);
    const container = node.querySelector('#container');
    const { history, isLiveMode } = this.props;
    if (prevProps.isLiveMode === false && isLiveMode === true) {
      // switch from past to live mode
      this.timeline.setSelection([]);
      return;
    }
    if (container) {
      container.innerHTML = '';
      const dataset = Object.entries(history)
        .filter(
          ([_, view]: [string, any]) =>
            view.status === 'ERROR' || view.status === 'WARNING'
        )
        .map(([ts, view]: [string, any], i) => {
          const date = moment(parseInt(ts));
          return {
            date,
            id: i,
            content: '',
            start: date.format(Timeline.DATE_FORMAT),
            title: date.format(Timeline.DATE_FORMAT),
            className: `${view.status} background`
          };
        })
        .sort((a, b) => a.start.localeCompare(b.start));
      if (dataset.length > 0) {
        const timeline = new vis.Timeline(container, dataset, {
          height: 60,
          min: dataset[0].date
            .clone()
            .subtract(1, 'hour')
            .format(Timeline.DATE_FORMAT),
          max: dataset[dataset.length - 1].date
            .clone()
            .add(1, 'hour')
            .format(Timeline.DATE_FORMAT),
          type: 'point',
          stack: false,
          zoomMin: 60 * 1000
        });
        timeline.on('select', ({ items }) => {
          if (items.length > 0) {
            const entry = dataset.find(_ => _.id === items[0]);
            const timestamp = entry && entry.date.valueOf();
            this.props.switchBoardView(false, timestamp);
          } else {
            this.props.switchBoardView(true);
          }
        });
        this.timeline = timeline;
      }
    }
  }
}

const select = (state: State) => ({
  history: state.history.data,
  error: state.history.error,
  isLoading: state.history.error,
  isLiveMode: state.isLiveMode
});

const actions = (dispatch, ownProps: Props) => ({
  fetchHistory: () => dispatch(fetchHistory(ownProps.boardTitle)),
  switchBoardView: (isLiveMode, timestamp = 0) =>
    dispatch(switchBoardView(isLiveMode, timestamp))
});

export default connect(select, actions)(Timeline);